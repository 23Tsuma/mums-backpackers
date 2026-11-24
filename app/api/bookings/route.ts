import { createHmac, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deliverBookingEmails } from '@/lib/server/booking-email';
import {
  BookingRateLimitError,
  BookingUnavailableError,
  createBookingRequest,
  isBookingDatabaseConfigured,
} from '@/lib/server/booking-database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bookingSchema = z.object({
  idempotencyKey: z.string().uuid(),
  unitId: z.number().int().min(1).max(255),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).regex(/^[+\d().\-\s]*$/).optional().default(''),
  checkin: z.string().date(),
  checkout: z.string().date(),
  adults: z.number().int().min(1).max(2),
  children: z.number().int().min(0).max(3),
  extraBeds: z.number().int().min(0).max(3),
  specialRequests: z.string().trim().max(2000).optional().default(''),
  website: z.string().max(300).optional().default(''),
}).strict().superRefine((booking, context) => {
  if (booking.children > 0 && booking.extraBeds === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extraBeds'],
      message: 'Please request at least one additional bed for children.',
    });
  }
  if (booking.children === 0 && booking.extraBeds > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extraBeds'],
      message: 'Additional beds are only available with a child request.',
    });
  }
});

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getSubmitterHash(request: Request, secret: string): string {
  const netlifyIp = request.headers.get('x-nf-client-connection-ip')?.trim();
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  const address = netlifyIp || forwardedIp || realIp || 'unknown';
  return createHmac('sha256', secret).update(address).digest('hex');
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > 20000) {
    return NextResponse.json({ error: 'The request is too large.' }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please submit a valid booking request.' }, { status: 400 });
  }

  if (typeof payload === 'object' && payload !== null && 'website' in payload && typeof payload.website === 'string' && payload.website.trim()) {
    return NextResponse.json({ accepted: true });
  }

  const parsed = bookingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please check the booking details and try again.' }, { status: 400 });
  }

  const bookingInput = parsed.data;
  const today = localDateString(new Date());
  if (bookingInput.checkin < today || bookingInput.checkout <= bookingInput.checkin) {
    return NextResponse.json({ error: 'Please choose valid check-in and check-out dates.' }, { status: 400 });
  }

  const rateLimitSecret = process.env.BOOKING_RATE_LIMIT_SECRET;
  if (!rateLimitSecret || !isBookingDatabaseConfigured()) {
    return NextResponse.json({ error: 'Online booking is temporarily unavailable. Please email info@mumsbackpackers.com.' }, { status: 503 });
  }

  try {
    const reference = `MB-${today.replace(/-/g, '')}-${randomBytes(5).toString('hex').toUpperCase()}`;
    const booking = await createBookingRequest({
      idempotency_key: bookingInput.idempotencyKey,
      reference,
      unit_id: bookingInput.unitId,
      name: bookingInput.name,
      email: bookingInput.email,
      phone: bookingInput.phone,
      checkin: bookingInput.checkin,
      checkout: bookingInput.checkout,
      guests: `${bookingInput.adults} adult${bookingInput.adults === 1 ? '' : 's'}, ${bookingInput.children} child${bookingInput.children === 1 ? '' : 'ren'}`,
      adults: bookingInput.adults,
      children: bookingInput.children,
      extra_beds_requested: bookingInput.extraBeds,
      children_approval_status: bookingInput.children > 0 ? 'Pending' : 'Not Required',
      accommodation_type: 'One-bedroom apartment',
      special_requests: bookingInput.specialRequests,
      submitter_hash: getSubmitterHash(request, rateLimitSecret),
    });

    const emailPending = await deliverBookingEmails(booking);
    return NextResponse.json({
      reference: booking.reference,
      status: booking.status,
      emailPending,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingRateLimitError) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }
    if (error instanceof BookingUnavailableError) {
      return NextResponse.json({
        error: 'We are temporarily fully booked for those dates. Please choose different dates.',
      }, { status: 409 });
    }

    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Booking request could not be processed.', {
      code,
    });
    return NextResponse.json({ error: 'We could not process your request. Please try again shortly.' }, { status: 503 });
  }
}
