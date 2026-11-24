import { NextResponse } from 'next/server';
import { sendAdminConfirmationEmail } from '@/lib/server/admin-confirmation-email';
import { getAdminFromRequest, isSameOriginRequest } from '@/lib/server/admin-auth';
import { updateVehicleRentalEnquiryStatus } from '@/lib/server/admin-bookings';
import { isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Vehicle rental records are unavailable.' }, { status: 503 });
  try {
    if (!await getAdminFromRequest(request)) return NextResponse.json({ error: 'Please sign in to update rental requests.' }, { status: 401 });
    if (!/^[0-9a-f-]{36}$/i.test(context.params.id)) return NextResponse.json({ error: 'Rental request not found.' }, { status: 404 });
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('status' in body)
      || !['New', 'Contacted', 'Confirmed', 'Closed'].includes(String(body.status))) {
      return NextResponse.json({ error: 'Choose a valid rental request status.' }, { status: 400 });
    }
    const status = body.status as 'New' | 'Contacted' | 'Confirmed' | 'Closed';
    const updated = await updateVehicleRentalEnquiryStatus(context.params.id, status);
    if (!updated) return NextResponse.json({ error: 'Rental request not found.' }, { status: 404 });
    const email = status === 'Confirmed'
      ? await sendAdminConfirmationEmail('Vehicle rental', {
        id: updated.id,
        name: updated.client_name,
        email: updated.email,
        details: [
          ['Vehicle', updated.vehicle],
          ['Picking date', updated.pickup_date],
          ['Duration', `${updated.duration_days} day${updated.duration_days === 1 ? '' : 's'}`],
          ['Telephone', updated.telephone],
        ],
      })
      : undefined;
    return NextResponse.json({ updated: true, ...(email ? { email } : {}) });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Vehicle rental enquiry status could not be updated.', { code });
    return NextResponse.json({ error: 'Rental request could not be updated. Please try again.' }, { status: 503 });
  }
}
