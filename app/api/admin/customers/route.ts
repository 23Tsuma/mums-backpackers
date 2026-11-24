import { NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/server/admin-auth';
import { listAdminCustomers, listSafariEnquiries, listVehicleRentalEnquiries } from '@/lib/server/admin-bookings';
import { isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Customer records are unavailable.' }, { status: 503 });
  try {
    if (!await getAdminFromRequest(request)) return NextResponse.json({ error: 'Please sign in to view customer records.' }, { status: 401 });
    const [customers, safariEnquiries, vehicleRentalEnquiries] = await Promise.all([
      listAdminCustomers(),
      listSafariEnquiries(),
      listVehicleRentalEnquiries(),
    ]);
    return NextResponse.json({ customers, safariEnquiries, vehicleRentalEnquiries });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Admin customer records could not be loaded.', { code });
    return NextResponse.json({ error: 'Customer records could not be loaded. Please try again.' }, { status: 503 });
  }
}
