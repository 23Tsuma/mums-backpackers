import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { deliverBookingEmails } from '@/lib/server/booking-email';
import { getPendingBookingEmails, isBookingDatabaseConfigured } from '@/lib/server/booking-database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request, secret: string): boolean {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const provided = Buffer.from(token);
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function POST(request: Request) {
  const secret = process.env.BOOKING_RETRY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Retry service is not configured.' }, { status: 503 });
  }
  if (!isAuthorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!isBookingDatabaseConfigured()) {
    return NextResponse.json({ error: 'Retry service is not configured.' }, { status: 503 });
  }

  try {
    const bookings = await getPendingBookingEmails();

    for (const booking of bookings) {
      await deliverBookingEmails(booking);
    }

    return NextResponse.json({ processed: bookings.length });
  } catch (error) {
    console.error('Booking email retry failed.', {
      message: error instanceof Error ? error.message : 'Unknown server error',
    });
    return NextResponse.json({ error: 'Retry service is temporarily unavailable.' }, { status: 503 });
  }
}
