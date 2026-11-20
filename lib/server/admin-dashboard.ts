import type { RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '@/lib/server/mysql';

interface BookingCounts extends RowDataPacket {
  total: number;
  pending: number;
  confirmed: number;
  declined: number;
  cancelled: number;
  completed: number;
}

interface PropertyCount extends RowDataPacket {
  total: number;
}

export interface AdminDashboardBooking extends RowDataPacket {
  reference: string;
  name: string;
  unit_code: string | null;
  checkin: string;
  checkout: string;
  status: string;
  created_at: string;
}

export interface AdminDashboardSummary {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  declinedBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  totalApartments: number;
  upcomingArrivals: AdminDashboardBooking[];
  upcomingDepartures: AdminDashboardBooking[];
  recentBookings: AdminDashboardBooking[];
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const database = getDatabasePool();
  const [countResult, apartmentResult, arrivalResult, departureResult, recentResult] = await Promise.all([
    database.query<BookingCounts[]>(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(status = 'Pending Confirmation'), 0) AS pending,
              COALESCE(SUM(status = 'Confirmed'), 0) AS confirmed,
              COALESCE(SUM(status = 'Declined'), 0) AS declined,
              COALESCE(SUM(status = 'Cancelled'), 0) AS cancelled,
              COALESCE(SUM(status = 'Completed'), 0) AS completed
       FROM booking_requests`,
    ),
    database.query<PropertyCount[]>(
      'SELECT COUNT(*) AS total FROM accommodation_units WHERE is_active = TRUE',
    ),
    database.query<AdminDashboardBooking[]>(
      `SELECT booking.reference, booking.name, unit.unit_code,
              booking.checkin, booking.checkout, booking.status, booking.created_at
       FROM booking_requests AS booking
       LEFT JOIN accommodation_units AS unit ON unit.id = booking.unit_id
       WHERE booking.checkin >= UTC_DATE()
         AND booking.status NOT IN ('Declined', 'Cancelled', 'Completed')
       ORDER BY booking.checkin ASC
       LIMIT 5`,
    ),
    database.query<AdminDashboardBooking[]>(
      `SELECT booking.reference, booking.name, unit.unit_code,
              booking.checkin, booking.checkout, booking.status, booking.created_at
       FROM booking_requests AS booking
       LEFT JOIN accommodation_units AS unit ON unit.id = booking.unit_id
       WHERE booking.checkout >= UTC_DATE()
         AND booking.status NOT IN ('Declined', 'Cancelled', 'Completed')
       ORDER BY booking.checkout ASC
       LIMIT 5`,
    ),
    database.query<AdminDashboardBooking[]>(
      `SELECT booking.reference, booking.name, unit.unit_code,
              booking.checkin, booking.checkout, booking.status, booking.created_at
       FROM booking_requests AS booking
       LEFT JOIN accommodation_units AS unit ON unit.id = booking.unit_id
       ORDER BY booking.created_at DESC
       LIMIT 8`,
    ),
  ]);
  const [counts] = countResult[0];
  const [apartments] = apartmentResult[0];

  return {
    totalBookings: Number(counts?.total ?? 0),
    pendingBookings: Number(counts?.pending ?? 0),
    confirmedBookings: Number(counts?.confirmed ?? 0),
    declinedBookings: Number(counts?.declined ?? 0),
    cancelledBookings: Number(counts?.cancelled ?? 0),
    completedBookings: Number(counts?.completed ?? 0),
    totalApartments: Number(apartments?.total ?? 0),
    upcomingArrivals: arrivalResult[0],
    upcomingDepartures: departureResult[0],
    recentBookings: recentResult[0],
  };
}
