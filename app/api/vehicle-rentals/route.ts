import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabasePool, isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const vehicles = [
  '7L Van (Chauffeur Driven)',
  'Landcruiser Safari Van',
  'Harrier / Lexus',
  'Motorbike (Motocross)',
  'Rav 4 / XTrail / Mazda 5CX',
  'Medium',
  'Noah / Voxy',
  'Saloon Cars',
  'Prado TX',
] as const;

const rentalSchema = z.object({
  vehicle: z.enum(vehicles),
  name: z.string().trim().min(2).max(120),
  telephone: z.string().trim().min(7).max(40).regex(/^[+\d().\-\s]+$/),
  email: z.string().trim().email().max(254),
  pickupDate: z.string().date(),
  durationDays: z.number().int().min(1).max(90),
}).strict();

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? '0') > 20000) {
    return NextResponse.json({ error: 'The request is too large.' }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please submit a valid vehicle rental request.' }, { status: 400 });
  }
  const parsed = rentalSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Please check the rental details and try again.' }, { status: 400 });
  const rental = parsed.data;
  const today = new Date();
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (rental.pickupDate < todayText) return NextResponse.json({ error: 'Choose a picking date that is today or later.' }, { status: 400 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Vehicle rental requests are temporarily unavailable. Please contact us directly.' }, { status: 503 });
  try {
    await getDatabasePool().execute(
      `INSERT INTO vehicle_rental_enquiries
       (id, vehicle, client_name, telephone, email, pickup_date, duration_days)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        rental.vehicle,
        rental.name,
        rental.telephone,
        rental.email,
        rental.pickupDate,
        rental.durationDays,
      ],
    );
    return NextResponse.json({ accepted: true }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Vehicle rental request could not be saved.', { code });
    return NextResponse.json({ error: 'Your vehicle rental request could not be saved. Please try again shortly.' }, { status: 503 });
  }
}
