import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  adminSessionCookieName,
  changeAdminPassword,
  getAdminSession,
  isSameOriginRequest,
} from '@/lib/server/admin-auth';
import { isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
}).strict();

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? '0') > 10000) {
    return NextResponse.json({ error: 'The request is too large.' }, { status: 413 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Password changes are temporarily unavailable.' }, { status: 503 });
  }

  const cookie = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${adminSessionCookieName()}=`));
  const token = cookie?.slice(adminSessionCookieName().length + 1);
  let admin;
  try {
    admin = await getAdminSession(token);
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Admin session validation failed during password change.', { code });
    return NextResponse.json({ error: 'Password changes are temporarily unavailable.' }, { status: 503 });
  }
  if (!admin) {
    return NextResponse.json({ error: 'Please sign in again before changing your password.' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please submit valid password details.' }, { status: 400 });
  }
  const parsed = passwordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'The new password must be at least 12 characters.' }, { status: 400 });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json({ error: 'Choose a new password different from your current password.' }, { status: 400 });
  }

  try {
    const changed = await changeAdminPassword(
      admin.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
    );
    if (!changed) {
      return NextResponse.json({ error: 'The current password is incorrect. No changes were made.' }, { status: 400 });
    }

    const response = NextResponse.json({ changed: true });
    response.cookies.set(adminSessionCookieName(), '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Admin password change failed.', { code });
    return NextResponse.json({ error: 'The password could not be changed. Please try again.' }, { status: 503 });
  }
}
