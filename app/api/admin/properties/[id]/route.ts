import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminFromRequest, isSameOriginRequest } from '@/lib/server/admin-auth';
import { isDatabaseConfigured } from '@/lib/server/mysql';
import {
  getAccommodationProperty,
  setAccommodationPropertyActive,
  updateAccommodationProperty,
} from '@/lib/server/properties';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const nullableCount = z.number().int().min(0).max(20).nullable();
const propertySchema = z.object({
  name: z.string().trim().min(2).max(120),
  accommodationType: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000),
  location: z.string().trim().max(255),
  bedrooms: z.number().int().min(1).max(20),
  bathrooms: z.number().min(0).max(20).multipleOf(0.5).nullable(),
  hasSittingRoom: z.boolean(),
  childAccommodationNotes: z.string().trim().max(2000),
  maxChildren: nullableCount,
  extraBedsAvailable: nullableCount,
  extraBedNotes: z.string().trim().max(2000),
  amenities: z.array(z.string().trim().min(1).max(80)).max(20),
  nightlyPrice: z.number().min(0).max(1000000).multipleOf(0.01).nullable(),
}).strict();

const statusSchema = z.object({ isActive: z.boolean() }).strict();

function validId(value: string): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 255 ? id : undefined;
}

function logDatabaseError(message: string, error: unknown): void {
  const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
  console.error(message, { code });
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } },
) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? '0') > 30000) {
    return NextResponse.json({ error: 'The request is too large.' }, { status: 413 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Property management is temporarily unavailable.' }, { status: 503 });
  }

  try {
    if (!await getAdminFromRequest(request)) {
      return NextResponse.json({ error: 'Please sign in to manage properties.' }, { status: 401 });
    }
    const id = validId(context.params.id);
    if (!id) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });

    const body: unknown = await request.json();
    const status = statusSchema.safeParse(body);
    if (status.success) {
      const updated = await setAccommodationPropertyActive(id, status.data.isActive);
      if (!updated) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
      return NextResponse.json({ property: await getAccommodationProperty(id) });
    }

    const parsed = propertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Review the property details and try again.' }, { status: 400 });
    }
    const updated = await updateAccommodationProperty(id, parsed.data);
    if (!updated) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
    return NextResponse.json({ property: await getAccommodationProperty(id) });
  } catch (error) {
    logDatabaseError('Admin property could not be updated.', error);
    return NextResponse.json({ error: 'Property could not be updated. Please try again.' }, { status: 503 });
  }
}
