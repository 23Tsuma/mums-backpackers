import { NextResponse } from 'next/server';
import { getAdminFromRequest, isSameOriginRequest } from '@/lib/server/admin-auth';
import { getBookingForEmailRetry, listAdminBookings } from '@/lib/server/admin-bookings';
import { deliverBookingEmails } from '@/lib/server/booking-email';
import { isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Email delivery records are unavailable.' }, { status: 503 });
  try {
    if (!await getAdminFromRequest(request)) return NextResponse.json({ error: 'Please sign in to view email records.' }, { status: 401 });
    return NextResponse.json({ bookings: await listAdminBookings({ limit: 200 }) });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Admin email records could not be loaded.', { code });
    return NextResponse.json({ error: 'Email records could not be loaded. Please try again.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Email retry is unavailable.' }, { status: 503 });
  try {
    if (!await getAdminFromRequest(request)) return NextResponse.json({ error: 'Please sign in to retry email delivery.' }, { status: 401 });
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('bookingId' in body)
      || typeof body.bookingId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.bookingId)) {
      return NextResponse.json({ error: 'Choose a valid booking.' }, { status: 400 });
    }
    const booking = await getBookingForEmailRetry(body.bookingId);
    if (!booking) return NextResponse.json({ error: 'No pending email delivery was found for this booking.' }, { status: 404 });
    const emailPending = await deliverBookingEmails(booking);
    return NextResponse.json({ emailPending });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Admin email retry failed.', { code });
    return NextResponse.json({ error: 'Email delivery could not be retried. Please try again.' }, { status: 503 });
  }
}
