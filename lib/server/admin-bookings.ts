import type { RowDataPacket } from 'mysql2/promise';
import type { BookingRecord } from '@/lib/server/booking-database';
import { getDatabasePool } from '@/lib/server/mysql';

export const bookingStatuses = [
  'Pending Confirmation',
  'Confirmed',
  'Declined',
  'Cancelled',
  'Completed',
] as const;

export interface AdminBooking extends RowDataPacket {
  id: string;
  reference: string;
  name: string;
  email: string;
  phone: string;
  unit_code: string | null;
  checkin: string;
  checkout: string;
  adults: number | null;
  children: number | null;
  extra_beds_requested: number | null;
  children_approval_status: string | null;
  guests: string;
  special_requests: string;
  status: string;
  created_at: string;
  customer_email_sent_at: string | null;
  admin_email_sent_at: string | null;
  customer_email_attempts: number;
  admin_email_attempts: number;
  customer_email_next_attempt_at: string | null;
  admin_email_next_attempt_at: string | null;
  customer_email_last_error: string | null;
  admin_email_last_error: string | null;
  confirmation_email_sent_at: string | null;
  confirmation_email_attempts: number;
  confirmation_email_last_error: string | null;
}

export interface AdminCustomer extends RowDataPacket {
  name: string;
  email: string;
  phone: string;
  booking_count: number;
  first_booking: string;
  latest_booking: string;
}

export interface SafariEnquiry extends RowDataPacket {
  id: string;
  lead_explorer: string;
  email: string;
  phone: string;
  destination: string;
  target_date: string;
  travelers: number;
  duration: string;
  custom_extension: string;
  diani_accommodation: string;
  status: string;
  created_at: string;
  confirmation_email_sent_at: string | null;
  confirmation_email_attempts: number;
  confirmation_email_last_error: string | null;
}

export interface VehicleRentalEnquiry extends RowDataPacket {
  id: string;
  vehicle: string;
  client_name: string;
  telephone: string;
  email: string;
  pickup_date: string;
  duration_days: number;
  status: string;
  created_at: string;
  confirmation_email_sent_at: string | null;
  confirmation_email_attempts: number;
  confirmation_email_last_error: string | null;
}

export async function listAdminBookings(options: {
  query?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
} = {}): Promise<AdminBooking[]> {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (options.query) {
    const search = `%${options.query}%`;
    conditions.push('(booking.reference LIKE ? OR booking.name LIKE ? OR booking.email LIKE ? OR booking.phone LIKE ?)');
    values.push(search, search, search, search);
  }
  if (options.status) {
    conditions.push('booking.status = ?');
    values.push(options.status);
  }
  if (options.from) {
    conditions.push('booking.checkout >= ?');
    values.push(options.from);
  }
  if (options.to) {
    conditions.push('booking.checkin <= ?');
    values.push(options.to);
  }

  const limit = Math.min(Math.max(options.limit ?? 200, 1), 500);
  const [rows] = await getDatabasePool().execute<AdminBooking[]>(
    `SELECT booking.id, booking.reference, booking.name, booking.email, booking.phone,
            unit.unit_code, booking.checkin, booking.checkout, booking.adults,
            booking.children, booking.extra_beds_requested, booking.children_approval_status,
            booking.guests, booking.special_requests, booking.status, booking.created_at,
            booking.customer_email_sent_at, booking.admin_email_sent_at,
            booking.customer_email_attempts, booking.admin_email_attempts,
            booking.customer_email_next_attempt_at, booking.admin_email_next_attempt_at,
            booking.customer_email_last_error, booking.admin_email_last_error,
            booking.confirmation_email_sent_at, booking.confirmation_email_attempts,
            booking.confirmation_email_last_error
     FROM booking_requests AS booking
     LEFT JOIN accommodation_units AS unit ON unit.id = booking.unit_id
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY booking.created_at DESC, booking.checkin ASC
     LIMIT ${limit}`,
    values,
  );
  return rows;
}

export async function updateBookingStatus(
  id: string,
  status: typeof bookingStatuses[number],
): Promise<AdminBooking | undefined> {
  await getDatabasePool().execute(
    `UPDATE booking_requests
     SET status = ?,
         children_approval_status = CASE
           WHEN ? = 'Confirmed' AND children > 0 THEN 'Approved'
           ELSE children_approval_status
         END,
         confirmation_email_sent_at = IF(? = 'Confirmed', confirmation_email_sent_at, NULL),
         confirmation_email_claimed_at = IF(? = 'Confirmed', confirmation_email_claimed_at, NULL),
         confirmation_email_attempts = IF(? = 'Confirmed', confirmation_email_attempts, 0),
         confirmation_email_last_error = IF(? = 'Confirmed', confirmation_email_last_error, NULL)
     WHERE id = ?`,
    [status, status, status, status, status, status, id],
  );
  const [rows] = await getDatabasePool().execute<AdminBooking[]>(
    `SELECT booking_requests.*, accommodation_units.unit_code
     FROM booking_requests
     LEFT JOIN accommodation_units ON accommodation_units.id = booking_requests.unit_id
     WHERE booking_requests.id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0];
}

export async function listAdminCustomers(): Promise<AdminCustomer[]> {
  const [rows] = await getDatabasePool().execute<AdminCustomer[]>(
    `SELECT MAX(name) AS name, email, MAX(phone) AS phone,
            COUNT(*) AS booking_count, MIN(checkin) AS first_booking,
            MAX(checkin) AS latest_booking
     FROM booking_requests
     GROUP BY email
     ORDER BY MAX(created_at) DESC
     LIMIT 250`,
  );
  return rows;
}

export async function listSafariEnquiries(): Promise<SafariEnquiry[]> {
  const [rows] = await getDatabasePool().execute<SafariEnquiry[]>(
    `SELECT id, lead_explorer, email, phone, destination, target_date,
            travelers, duration, custom_extension, diani_accommodation, status, created_at,
            confirmation_email_sent_at, confirmation_email_attempts, confirmation_email_last_error
     FROM safari_enquiries
     ORDER BY created_at DESC
     LIMIT 100`,
  );
  return rows;
}

export async function listVehicleRentalEnquiries(): Promise<VehicleRentalEnquiry[]> {
  const [rows] = await getDatabasePool().execute<VehicleRentalEnquiry[]>(
    `SELECT id, vehicle, client_name, telephone, email, pickup_date,
            duration_days, status, created_at, confirmation_email_sent_at,
            confirmation_email_attempts, confirmation_email_last_error
     FROM vehicle_rental_enquiries
     ORDER BY created_at DESC
     LIMIT 100`,
  );
  return rows;
}

export async function updateSafariEnquiryStatus(
  id: string,
  status: 'New' | 'Contacted' | 'Confirmed' | 'Closed',
): Promise<SafariEnquiry | undefined> {
  const database = getDatabasePool();
  await database.execute(
    `UPDATE safari_enquiries
     SET status = ?,
         confirmation_email_sent_at = IF(? = 'Confirmed', confirmation_email_sent_at, NULL),
         confirmation_email_claimed_at = IF(? = 'Confirmed', confirmation_email_claimed_at, NULL),
         confirmation_email_attempts = IF(? = 'Confirmed', confirmation_email_attempts, 0),
         confirmation_email_last_error = IF(? = 'Confirmed', confirmation_email_last_error, NULL)
     WHERE id = ?`,
    [status, status, status, status, status, id],
  );
  const [rows] = await database.execute<SafariEnquiry[]>(
    `SELECT id, lead_explorer, email, phone, destination, target_date,
            travelers, duration, custom_extension, diani_accommodation, status, created_at,
            confirmation_email_sent_at, confirmation_email_attempts, confirmation_email_last_error
     FROM safari_enquiries WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0];
}

export async function updateVehicleRentalEnquiryStatus(
  id: string,
  status: 'New' | 'Contacted' | 'Confirmed' | 'Closed',
): Promise<VehicleRentalEnquiry | undefined> {
  const database = getDatabasePool();
  await database.execute(
    `UPDATE vehicle_rental_enquiries
     SET status = ?,
         confirmation_email_sent_at = IF(? = 'Confirmed', confirmation_email_sent_at, NULL),
         confirmation_email_claimed_at = IF(? = 'Confirmed', confirmation_email_claimed_at, NULL),
         confirmation_email_attempts = IF(? = 'Confirmed', confirmation_email_attempts, 0),
         confirmation_email_last_error = IF(? = 'Confirmed', confirmation_email_last_error, NULL)
     WHERE id = ?`,
    [status, status, status, status, status, id],
  );
  const [rows] = await database.execute<VehicleRentalEnquiry[]>(
    `SELECT id, vehicle, client_name, telephone, email, pickup_date,
            duration_days, status, created_at, confirmation_email_sent_at,
            confirmation_email_attempts, confirmation_email_last_error
     FROM vehicle_rental_enquiries WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0];
}

export async function getBookingForEmailRetry(id: string): Promise<BookingRecord | undefined> {
  const database = getDatabasePool();
  await database.execute(
    `UPDATE booking_requests
     SET admin_email_attempts = IF(
           admin_email_sent_at IS NULL
           AND (admin_email_claimed_at IS NULL OR admin_email_claimed_at < UTC_TIMESTAMP(3) - INTERVAL 15 MINUTE),
           0, admin_email_attempts
         ),
         admin_email_next_attempt_at = IF(
           admin_email_sent_at IS NULL
           AND (admin_email_claimed_at IS NULL OR admin_email_claimed_at < UTC_TIMESTAMP(3) - INTERVAL 15 MINUTE),
           NULL, admin_email_next_attempt_at
         ),
         admin_email_claimed_at = IF(
           admin_email_sent_at IS NULL
           AND admin_email_claimed_at < UTC_TIMESTAMP(3) - INTERVAL 15 MINUTE,
           NULL, admin_email_claimed_at
         ),
         customer_email_attempts = IF(
           customer_email_sent_at IS NULL
           AND (customer_email_claimed_at IS NULL OR customer_email_claimed_at < UTC_TIMESTAMP(3) - INTERVAL 15 MINUTE),
           0, customer_email_attempts
         ),
         customer_email_next_attempt_at = IF(
           customer_email_sent_at IS NULL
           AND (customer_email_claimed_at IS NULL OR customer_email_claimed_at < UTC_TIMESTAMP(3) - INTERVAL 15 MINUTE),
           NULL, customer_email_next_attempt_at
         ),
         customer_email_claimed_at = IF(
           customer_email_sent_at IS NULL
           AND customer_email_claimed_at < UTC_TIMESTAMP(3) - INTERVAL 15 MINUTE,
           NULL, customer_email_claimed_at
         )
     WHERE id = ?
       AND (admin_email_sent_at IS NULL OR customer_email_sent_at IS NULL)`,
    [id],
  );
  const [bookings] = await database.execute<BookingRecord[]>(
    `SELECT booking_requests.*, accommodation_units.unit_code
     FROM booking_requests
     LEFT JOIN accommodation_units ON accommodation_units.id = booking_requests.unit_id
     WHERE booking_requests.id = ?
       AND (booking_requests.admin_email_sent_at IS NULL OR booking_requests.customer_email_sent_at IS NULL)
     LIMIT 1`,
    [id],
  );
  return bookings[0];
}
