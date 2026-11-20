import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApartmentAvailability, isBookingDatabaseConfigured } from '@/lib/server/booking-database';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const dateSchema = z.string().date();

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams;
  const checkin = dateSchema.safeParse(search.get('checkin'));
  const checkout = dateSchema.safeParse(search.get('checkout'));

  if (!checkin.success || !checkout.success || checkout.data <= checkin.data) {
    return NextResponse.json({ error: 'Please choose valid check-in and check-out dates.' }, { status: 400 });
  }
  if (checkin.data < localDateString(new Date())) {
    return NextResponse.json({ error: 'Check-in date cannot be in the past.' }, { status: 400 });
  }
  if (!isBookingDatabaseConfigured()) {
    return NextResponse.json({ error: 'Apartment availability is temporarily unavailable.' }, { status: 503 });
  }

  try {
    const apartments = await getApartmentAvailability(checkin.data, checkout.data);
    return NextResponse.json({
      apartments: apartments.map((apartment) => ({
        id: apartment.id,
        unitCode: apartment.unit_code,
        name: apartment.name,
        accommodationType: apartment.accommodation_type,
        adultCapacity: apartment.adult_capacity,
        hasSittingRoom: Boolean(apartment.has_sitting_room),
        available: Boolean(apartment.available),
      })),
    });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Apartment availability could not be loaded.', { code });
    return NextResponse.json({ error: 'Apartment availability is temporarily unavailable.' }, { status: 503 });
  }
}
