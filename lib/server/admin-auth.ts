import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { getDatabasePool, isDatabaseConfigured } from '@/lib/server/mysql';

const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;

interface AdminUserRecord extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
  password_salt: string;
  is_active: number;
  is_locked: number;
}

interface AdminSessionRecord extends RowDataPacket {
  id: string;
  email: string;
}

export interface AdminIdentity {
  id: string;
  email: string;
}

export class AdminSetupCompleteError extends Error {
  constructor() {
    super('An administrator account already exists.');
    this.name = 'AdminSetupCompleteError';
  }
}

export class AdminSetupTokenError extends Error {
  constructor() {
    super('The admin setup token is invalid.');
    this.name = 'AdminSetupTokenError';
  }
}

export class AdminAuthConfigurationError extends Error {
  constructor() {
    super('Admin authentication is not configured.');
    this.name = 'AdminAuthConfigurationError';
  }
}

function derivePassword(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 }, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return (await derivePassword(password, salt)).toString('hex');
}

async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  const actualHash = await derivePassword(password, salt);
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === actualHash.length && timingSafeEqual(actualHash, expected);
}

function secureStringEquals(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && timingSafeEqual(providedBuffer, expectedBuffer);
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isAdminSetupConfigured(): boolean {
  return isDatabaseConfigured()
    && Boolean(process.env.ADMIN_SETUP_TOKEN)
    && Buffer.byteLength(process.env.ADMIN_SETUP_TOKEN ?? '') >= 32;
}

export function adminSessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Host-mums_admin_session'
    : 'mums_admin_session';
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function getAdminFromRequest(request: Request): Promise<AdminIdentity | null> {
  const sessionCookie = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${adminSessionCookieName()}=`));
  const token = sessionCookie?.slice(adminSessionCookieName().length + 1);
  return getAdminSession(token);
}

export async function createInitialAdmin(
  email: string,
  password: string,
  setupToken: string,
): Promise<void> {
  const expectedToken = process.env.ADMIN_SETUP_TOKEN;
  if (!isAdminSetupConfigured() || !expectedToken) {
    throw new AdminAuthConfigurationError();
  }
  if (!secureStringEquals(setupToken, expectedToken)) {
    throw new AdminSetupTokenError();
  }

  const database = getDatabasePool();
  const connection = await database.getConnection();
  let lockAcquired = false;

  try {
    const [lockRows] = await connection.query<RowDataPacket[]>(
      'SELECT GET_LOCK(?, 5) AS acquired',
      ['mums-backpackers-admin-bootstrap'],
    );
    if (Number(lockRows[0]?.acquired) !== 1) {
      throw new Error('Could not acquire the admin setup lock.');
    }
    lockAcquired = true;

    const [adminRows] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS admin_count FROM admin_users',
    );
    if (Number(adminRows[0]?.admin_count ?? 0) > 0) {
      throw new AdminSetupCompleteError();
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = await hashPassword(password, salt);
    await connection.execute(
      `INSERT INTO admin_users (id, email, password_hash, password_salt)
       VALUES (?, ?, ?, ?)`,
      [randomUUID(), email.toLowerCase(), passwordHash, salt],
    );
  } finally {
    if (lockAcquired) {
      await connection.query('SELECT RELEASE_LOCK(?)', ['mums-backpackers-admin-bootstrap']);
    }
    connection.release();
  }
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<{ admin: AdminIdentity; sessionToken: string } | null> {
  const database = getDatabasePool();
  const [rows] = await database.execute<AdminUserRecord[]>(
    `SELECT id, email, password_hash, password_salt, is_active,
            (locked_until IS NOT NULL AND locked_until > UTC_TIMESTAMP(3)) AS is_locked
     FROM admin_users
     WHERE email = ?
     LIMIT 1`,
    [email.toLowerCase()],
  );
  const admin = rows[0];
  if (!admin || Number(admin.is_active) !== 1 || Number(admin.is_locked) === 1) {
    return null;
  }

  const validPassword = await verifyPassword(password, admin.password_salt, admin.password_hash);
  if (!validPassword) {
    await database.execute(
      `UPDATE admin_users
       SET locked_until = CASE
             WHEN failed_login_attempts >= ? THEN DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE)
             ELSE locked_until
           END,
           failed_login_attempts = LEAST(failed_login_attempts + 1, ?)
       WHERE id = ?
         AND (locked_until IS NULL OR locked_until <= UTC_TIMESTAMP(3))`,
      [MAX_FAILED_LOGINS - 1, MAX_FAILED_LOGINS, admin.id],
    );
    return null;
  }

  const sessionToken = randomBytes(32).toString('base64url');
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE admin_users
       SET failed_login_attempts = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [admin.id],
    );
    await connection.execute(
      `INSERT INTO admin_sessions (id, admin_user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`,
      [
        randomUUID(),
        admin.id,
        tokenHash(sessionToken),
        new Date(Date.now() + SESSION_LIFETIME_MS),
      ],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { admin: { id: admin.id, email: admin.email }, sessionToken };
}

export async function getAdminSession(token: string | undefined): Promise<AdminIdentity | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;

  const [rows] = await getDatabasePool().execute<AdminSessionRecord[]>(
    `SELECT admin_users.id, admin_users.email
     FROM admin_sessions
     INNER JOIN admin_users ON admin_users.id = admin_sessions.admin_user_id
     WHERE admin_sessions.token_hash = ?
       AND admin_sessions.expires_at > UTC_TIMESTAMP(3)
       AND admin_users.is_active = TRUE
     LIMIT 1`,
    [tokenHash(token)],
  );
  return rows[0] ? { id: rows[0].id, email: rows[0].email } : null;
}

export async function deleteAdminSession(token: string | undefined): Promise<void> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await getDatabasePool().execute(
    'DELETE FROM admin_sessions WHERE token_hash = ?',
    [tokenHash(token)],
  );
}

export async function changeAdminPassword(
  adminId: string,
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const database = getDatabasePool();
  const [rows] = await database.execute<AdminUserRecord[]>(
    `SELECT id, email, password_hash, password_salt, is_active, 0 AS is_locked
     FROM admin_users
     WHERE id = ?
     LIMIT 1`,
    [adminId],
  );
  const admin = rows[0];
  if (!admin || Number(admin.is_active) !== 1) return false;

  const validPassword = await verifyPassword(currentPassword, admin.password_salt, admin.password_hash);
  if (!validPassword) return false;

  const newSalt = randomBytes(16).toString('hex');
  const newHash = await hashPassword(newPassword, newSalt);
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `UPDATE admin_users
       SET password_hash = ?, password_salt = ?, failed_login_attempts = 0, locked_until = NULL
       WHERE id = ? AND password_hash = ? AND password_salt = ?`,
      [newHash, newSalt, admin.id, admin.password_hash, admin.password_salt],
    );
    if ('affectedRows' in result && result.affectedRows !== 1) {
      await connection.rollback();
      return false;
    }
    await connection.execute('DELETE FROM admin_sessions WHERE admin_user_id = ?', [admin.id]);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
