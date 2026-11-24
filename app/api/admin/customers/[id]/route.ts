import { NextResponse } from 'next/server';
import { sendAdminConfirmationEmail } from '@/lib/server/admin-confirmation-email';
import { getAdminFromRequest, isSameOriginRequest } from '@/lib/server/admin-auth';
import { updateSafariEnquiryStatus } from '@/lib/server/admin-bookings';
import { isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: 'Customer records are unavailable.' }, { status: 503 });
  try {
    if (!await getAdminFromRequest(request)) return NextResponse.json({ error: 'Please sign in to update enquiries.' }, { status: 401 });
    if (!/^[0-9a-f-]{36}$/i.test(context.params.id)) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null || !('status' in body)
      || !['New', 'Contacted', 'Confirmed', 'Closed'].includes(String(body.status))) {
      return NextResponse.json({ error: 'Choose a valid enquiry status.' }, { status: 400 });
    }
    const status = body.status as 'New' | 'Contacted' | 'Confirmed' | 'Closed';
    const updated = await updateSafariEnquiryStatus(context.params.id, status);
    if (!updated) return NextResponse.json({ error: 'Enquiry not found.' }, { status: 404 });
    const email = status === 'Confirmed'
      ? await sendAdminConfirmationEmail('Safari', {
        id: updated.id,
        name: updated.lead_explorer,
        email: updated.email,
        details: [
          ['Preferred destination', updated.destination],
          ['Target date', updated.target_date],
          ['Travelers', String(updated.travelers)],
          ['Duration', updated.duration],
          ...(updated.custom_extension ? [['Custom extension', updated.custom_extension] as [string, string]] : []),
          ...(updated.phone ? [['Phone', updated.phone] as [string, string]] : []),
          ...(updated.diani_accommodation ? [['Current Diani accommodation', updated.diani_accommodation] as [string, string]] : []),
        ],
      })
      : undefined;
    return NextResponse.json({ updated: true, ...(email ? { email } : {}) });
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Safari enquiry status could not be updated.', { code });
    return NextResponse.json({ error: 'Enquiry could not be updated. Please try again.' }, { status: 503 });
  }
}
