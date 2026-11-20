import { createPool, type Pool } from 'mysql2/promise';

let pool: Pool | undefined;

export function isDatabaseConfigured(): boolean {
  const port = Number(process.env.DB_PORT);
  return Boolean(
    process.env.DB_HOST
    && Number.isInteger(port)
    && port > 0
    && port <= 65535
    && process.env.DB_NAME
    && process.env.DB_USER
    && process.env.DB_PASSWORD,
  );
}

export function getDatabasePool(): Pool {
  if (pool) return pool;

  const host = process.env.DB_HOST;
  const port = Number(process.env.DB_PORT);
  const database = process.env.DB_NAME;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!isDatabaseConfigured() || !host || !database || !user || !password) {
    throw new Error('MySQL database is not configured.');
  }

  pool = createPool({
    host,
    port,
    database,
    user,
    password,
    ssl: process.env.DB_SSL === 'false' ? undefined : { rejectUnauthorized: true },
    connectionLimit: 3,
    waitForConnections: true,
    queueLimit: 20,
    connectTimeout: 10000,
    timezone: 'Z',
    dateStrings: true,
  });

  return pool;
}
