import { randomUUID } from 'node:crypto';
import {
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise';
import { getDatabasePool, isDatabaseConfigured } from '@/lib/server/mysql';

export type BookingEmailRecipient = 'admin' | 'customer';

export interface BookingRecord extends RowDataPacket {
  id: string;
  reference: string;
  idempotency_key: string;
  unit_id: number | null;
  unit_code: string | null;
  name: string;
  email: string;
  phone: string;
  checkin: string;
  checkout: string;
  guests: string;
  adults: number | null;
  children: number | null;
  extra_beds_requested: number | null;
  children_approval_status: string | null;
  accommodation_type: string;
  special_requests: string;
  status: string;
  created_at: string;
  customer_email_sent_at: string | null;
  admin_email_sent_at: string | null;
  customer_email_attempts: number;
  admin_email_attempts: number;
}

export interface NewBooking {
  idempotency_key: string;
  reference: string;
  unit_id: number;
  name: string;
  email: string;
  phone: string;
  checkin: string;
  checkout: string;
  guests: string;
  adults: number;
  children: number;
  extra_beds_requested: number;
  children_approval_status: 'Not Required' | 'Pending';
  accommodation_type: string;
  special_requests: string;
  submitter_hash: string;
}

export interface AccommodationAvailability extends RowDataPacket {
  id: number;
  unit_code: string;
  name: string;
  accommodation_type: string;
  adult_capacity: number;
  has_sitting_room: number;
  available: number;
}

export class BookingRateLimitError extends Error {
  constructor() {
    super('Booking rate limit exceeded.');
    this.name = 'BookingRateLimitError';
  }
}

export class BookingUnavailableError extends Error {
  constructor() {
    super('The selected apartment is not available for those dates.');
    this.name = 'BookingUnavailableError';
  }
}

export function isBookingDatabaseConfigured(): boolean {
  return isDatabaseConfigured();
}

async function findByIdempotencyKey(connection: Awaited<ReturnType<Pool['getConnection']>>, key: string): Promise<BookingRecord | undefined> {
  const [rows] = await connection.execute<BookingRecord[]>(
    `SELECT booking_requests.*, accommodation_units.unit_code
     FROM booking_requests
     LEFT JOIN accommodation_units ON accommodation_units.id = booking_requests.unit_id
     WHERE booking_requests.idempotency_key = ?
     LIMIT 1`,
    [key],
  );
  return rows[0];
}

export async function getApartmentAvailability(
  checkin: string,
  checkout: string,
): Promise<AccommodationAvailability[]> {
  const [rows] = await getDatabasePool().execute<AccommodationAvailability[]>(
    `SELECT
       unit.id,
       unit.unit_code,
       unit.name,
       unit.accommodation_type,
       unit.adult_capacity,
       unit.has_sitting_room,
       NOT EXISTS (
         SELECT 1
         FROM booking_requests AS booking
         WHERE booking.unit_id = unit.id
           AND booking.status = 'Confirmed'
           AND booking.checkin < ?
           AND booking.checkout > ?
       ) AS available
     FROM accommodation_units AS unit
     WHERE unit.is_active = TRUE
     ORDER BY unit.id`,
    [checkout, checkin],
  );
  return rows;
}

export async function createBookingRequest(input: NewBooking): Promise<BookingRecord> {
  const database = getDatabasePool();
  const connection = await database.getConnection();
  const lockName = `booking:${input.submitter_hash.slice(0, 55)}`;
  let lockAcquired = false;
  let transactionStarted = false;

  try {
    const existing = await findByIdempotencyKey(connection, input.idempotency_key);
    if (existing) return existing;

    const [lockRows] = await connection.query<RowDataPacket[]>(
      'SELECT GET_LOCK(?, 5) AS acquired',
      [lockName],
    );
    if (Number(lockRows[0]?.acquired) !== 1) {
      throw new Error('Could not acquire booking rate-limit lock.');
    }
    lockAcquired = true;

    await connection.beginTransaction();
    transactionStarted = true;

    const duplicate = await findByIdempotencyKey(connection, input.idempotency_key);
    if (duplicate) {
      await connection.commit();
      transactionStarted = false;
      return duplicate;
    }

    const [availableUnits] = await connection.execute<RowDataPacket[]>(
      `SELECT unit.id
       FROM accommodation_units AS unit
       WHERE unit.id = ?
         AND unit.is_active = TRUE
         AND NOT EXISTS (
           SELECT 1
           FROM booking_requests AS booking
           WHERE booking.unit_id = unit.id
             AND booking.status = 'Confirmed'
             AND booking.checkin < ?
             AND booking.checkout > ?
         )
       LIMIT 1`,
      [input.unit_id, input.checkout, input.checkin],
    );
    if (!availableUnits.length) throw new BookingUnavailableError();

    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS request_count
       FROM booking_requests
       WHERE submitter_hash = ?
         AND created_at >= UTC_TIMESTAMP(3) - INTERVAL 1 HOUR`,
      [input.submitter_hash],
    );
    if (Number(countRows[0]?.request_count ?? 0) >= 5) {
      throw new BookingRateLimitError();
    }

    await connection.execute<ResultSetHeader>(
      `INSERT INTO booking_requests (
        id, reference, idempotency_key, unit_id, name, email, phone, checkin, checkout,
        guests, adults, children, extra_beds_requested, children_approval_status,
        accommodation_type, special_requests, submitter_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        input.reference,
        input.idempotency_key,
        input.unit_id,
        input.name,
        input.email,
        input.phone,
        input.checkin,
        input.checkout,
        input.guests,
        input.adults,
        input.children,
        input.extra_beds_requested,
        input.children_approval_status,
        input.accommodation_type,
        input.special_requests,
        input.submitter_hash,
      ],
    );

    await connection.commit();
    transactionStarted = false;
    const booking = await findByIdempotencyKey(connection, input.idempotency_key);
    if (!booking) throw new Error('Saved booking could not be read back.');
    return booking;
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error instanceof Error && 'code' in error && error.code === 'ER_DUP_ENTRY') {
      const duplicate = await findByIdempotencyKey(connection, input.idempotency_key);
      if (duplicate) return duplicate;
    }
    throw error;
  } finally {
    if (lockAcquired) {
      await connection.query('SELECT RELEASE_LOCK(?)', [lockName]);
    }
    connection.release();
  }
}

export async function claimBookingEmail(id: string, recipient: BookingEmailRecipient): Promise<boolean> {
  const [result] = await getDatabasePool().execute<ResultSetHeader>(
    `UPDATE booking_requests
     SET ${recipient}_email_claimed_at = UTC_TIMESTAMP(3),
         ${recipient}_email_attempts = ${recipient}_email_attempts + 1
     WHERE id = ?
       AND ${recipient}_email_sent_at IS NULL
       AND ${recipient}_email_attempts < 8
       AND (${recipient}_email_next_attempt_at IS NULL OR ${recipient}_email_next_attempt_at <= UTC_TIMESTAMP(3))
       AND (${recipient}_email_claimed_at IS NULL OR ${recipient}_email_claimed_at < UTC_TIMESTAMP(3) - INTERVAL 15 MINUTE)`,
    [id],
  );
  return result.affectedRows === 1;
}

export async function completeBookingEmail(id: string, recipient: BookingEmailRecipient): Promise<void> {
  await getDatabasePool().execute(
    `UPDATE booking_requests
     SET ${recipient}_email_sent_at = UTC_TIMESTAMP(3),
         ${recipient}_email_claimed_at = NULL,
         ${recipient}_email_next_attempt_at = NULL,
         ${recipient}_email_last_error = NULL
     WHERE id = ?`,
    [id],
  );
}

export async function failBookingEmail(
  id: string,
  recipient: BookingEmailRecipient,
  message: string,
  retryAt: Date,
): Promise<void> {
  await getDatabasePool().execute(
    `UPDATE booking_requests
     SET ${recipient}_email_claimed_at = NULL,
         ${recipient}_email_next_attempt_at = ?,
         ${recipient}_email_last_error = ?
     WHERE id = ?`,
    [retryAt, message.slice(0, 1000), id],
  );
}

export async function getBookingEmailState(id: string): Promise<{
  admin_email_sent_at: string | null;
  customer_email_sent_at: string | null;
} | undefined> {
  const [rows] = await getDatabasePool().execute<RowDataPacket[]>(
    'SELECT admin_email_sent_at, customer_email_sent_at FROM booking_requests WHERE id = ? LIMIT 1',
    [id],
  );
  return rows[0] as {
    admin_email_sent_at: string | null;
    customer_email_sent_at: string | null;
  } | undefined;
}

export async function getPendingBookingEmails(): Promise<BookingRecord[]> {
  const [rows] = await getDatabasePool().execute<BookingRecord[]>(
    `SELECT booking_requests.*, accommodation_units.unit_code
     FROM booking_requests
     LEFT JOIN accommodation_units ON accommodation_units.id = booking_requests.unit_id
     WHERE (
       booking_requests.admin_email_sent_at IS NULL
       AND booking_requests.admin_email_attempts < 8
       AND (booking_requests.admin_email_next_attempt_at IS NULL OR booking_requests.admin_email_next_attempt_at <= UTC_TIMESTAMP(3))
     ) OR (
       booking_requests.customer_email_sent_at IS NULL
       AND booking_requests.customer_email_attempts < 8
       AND (booking_requests.customer_email_next_attempt_at IS NULL OR booking_requests.customer_email_next_attempt_at <= UTC_TIMESTAMP(3))
     )
     ORDER BY booking_requests.created_at ASC
     LIMIT 50`,
  );
  return rows;
}
