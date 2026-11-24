import { NextResponse } from 'next/server';
import { getAdminFromRequest, isSameOriginRequest } from '@/lib/server/admin-auth';
import { sendAdminConfirmationEmail } from '@/lib/server/admin-confirmation-email';
import {
  bookingStatuses,
  listAdminBookings,
  listSafariEnquiries,
  listVehicleRentalEnquiries,
  updateBookingStatus,
} from '@/lib/server/admin-bookings';
import { isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Booking management is unavailable.' }, { status: 503 });
  try {
    if (!await getAdminFromRequest(request)) return NextResponse.json({ error: 'Please sign in to view bookings.' }, { status: 401 });
    const params = new URL(request.url).searchParams;
    const status = params.get('status') ?? '';
    const query = (params.get('q') ?? '').trim().slice(0, 120);
    const from = params.get('from');
    const to = params.get('to');
    if (status && status !== 'all' && !bookingStatuses.includes(status as typeof bookingStatuses[number])) {
      return NextResponse.json({ error: 'Choose a valid booking status.' }, { status: 400 });
    }
    if ((from && !validDate(from)) || (to && !validDate(to))) {
      return NextResponse.json({ error: 'Choose a valid date range.' }, { status: 400 });
    }
    const [bookings, safariEnquiries, vehicleRentalEnquiries] = await Promise.all([
      listAdminBookings({
        query,
        status: status === 'all' ? '' : status,
        from: from ?? undefined,
        to: to ?? undefined,
        limit: 500,
      }),
      listSafariEnquiries(),
      listVehicleRentalEnquiries(),
    ]);
    return NextResponse.json({ bookings, safariEnquiries, vehicleRentalEnquiries });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Admin bookings could not be loaded.', { code });
    return NextResponse.json({ error: 'Bookings could not be loaded. Please try again.' }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Booking management is unavailable.' }, { status: 503 });
  try {
    if (!await getAdminFromRequest(request)) return NextResponse.json({ error: 'Please sign in to update bookings.' }, { status: 401 });
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('id' in body) || !('status' in body)
      || typeof body.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.id)
      || typeof body.status !== 'string' || !bookingStatuses.includes(body.status as typeof bookingStatuses[number])) {
      return NextResponse.json({ error: 'Review the booking status and try again.' }, { status: 400 });
    }
    const status = body.status as typeof bookingStatuses[number];
    const updated = await updateBookingStatus(body.id, status);
    if (!updated) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
    const email = status === 'Confirmed'
      ? await sendAdminConfirmationEmail('Room booking', {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        details: [
          ['Booking reference', updated.reference],
          ['Apartment', updated.unit_code ?? 'Not assigned'],
          ['Check-in', updated.checkin],
          ['Check-out', updated.checkout],
          ['Guests', updated.guests],
          ['Children', updated.children === null ? 'Not recorded' : String(updated.children)],
          ['Additional beds requested', updated.extra_beds_requested === null ? 'Not recorded' : String(updated.extra_beds_requested)],
          ...(updated.special_requests ? [['Special requests', updated.special_requests] as [string, string]] : []),
        ],
      })
      : undefined;
    return NextResponse.json({ updated: true, ...(email ? { email } : {}) });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Admin booking status could not be updated.', { code });
    if (code !== 'ER_SIGNAL_EXCEPTION') {
      return NextResponse.json({ error: 'Booking status could not be updated. Please try again.' }, { status: 503 });
    }
    return NextResponse.json({
      error: 'This status change could not be saved. Check apartment availability and child sleeping approval.',
    }, { status: 409 });
  }
}
