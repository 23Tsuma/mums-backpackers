import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getDatabasePool, isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const destinations = [
  'Tsavo East (Land of Red Elephants)',
  'Shimba Hills Reserve (Day Trip)',
  'Tsavo West & Mzima Springs',
  'Maasai Mara (Fly-in Safari)',
  'Amboseli',
  'Kisite Mpunguti',
  'Wasini Island',
  'Malindi',
] as const;

const durations = ['1-Day Excursion', '2 Days, 1 Night', '3 Days, 2 Nights', 'Custom Extension'] as const;

const enquirySchema = z.object({
  leadExplorer: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).regex(/^[+\d().\-\s]*$/).optional().default(''),
  destination: z.enum(destinations),
  targetDate: z.string().date(),
  travelers: z.number().int().min(1).max(20),
  duration: z.enum(durations),
  customExtension: z.string().trim().max(500).optional().default(''),
  dianiAccommodation: z.string().trim().max(500).optional().default(''),
  website: z.string().max(300).optional().default(''),
}).strict();

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? '0') > 20000) {
    return NextResponse.json({ error: 'The request is too large.' }, { status: 413 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please submit a valid safari enquiry.' }, { status: 400 });
  }
  if (typeof payload === 'object' && payload !== null && 'website' in payload
    && typeof payload.website === 'string' && payload.website.trim()) {
    return NextResponse.json({ accepted: true });
  }
  const parsed = enquirySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: 'Please check the safari details and try again.' }, { status: 400 });
  const enquiry = parsed.data;
  const today = new Date();
  const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (enquiry.targetDate < todayText) return NextResponse.json({ error: 'Choose a target date that is today or later.' }, { status: 400 });
  if (enquiry.duration === 'Custom Extension' && !enquiry.customExtension) {
    return NextResponse.json({ error: 'Please describe the custom safari extension you have in mind.' }, { status: 400 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Safari enquiries are temporarily unavailable. Please contact us directly.' }, { status: 503 });
  try {
    await getDatabasePool().execute(
      `INSERT INTO safari_enquiries
       (id, lead_explorer, email, phone, destination, target_date, travelers, duration, custom_extension, diani_accommodation)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        enquiry.leadExplorer,
        enquiry.email,
        enquiry.phone,
        enquiry.destination,
        enquiry.targetDate,
        enquiry.travelers,
        enquiry.duration,
        enquiry.customExtension,
        enquiry.dianiAccommodation,
      ],
    );
    return NextResponse.json({ accepted: true }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Safari enquiry could not be saved.', { code });
    return NextResponse.json({ error: 'Your enquiry could not be saved. Please try again shortly.' }, { status: 503 });
  }
}
