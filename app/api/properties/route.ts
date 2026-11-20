import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/server/mysql';
import { listAccommodationProperties } from '@/lib/server/properties';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Property listings are temporarily unavailable.' }, { status: 503 });
  }
  try {
    return NextResponse.json({
      properties: await listAccommodationProperties(true),
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Public properties could not be loaded.', { code });
    return NextResponse.json({ error: 'Property listings are temporarily unavailable.' }, { status: 503 });
  }
}
