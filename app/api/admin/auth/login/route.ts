import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  adminSessionCookieName,
  authenticateAdmin,
  isSameOriginRequest,
} from '@/lib/server/admin-auth';
import { isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
}).strict();

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? '0') > 10000) {
    return NextResponse.json({ error: 'The request is too large.' }, { status: 413 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Admin sign-in is temporarily unavailable.' }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please submit a valid sign-in request.' }, { status: 400 });
  }
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address and password.' }, { status: 400 });
  }

  try {
    const result = await authenticateAdmin(parsed.data.email, parsed.data.password);
    if (!result) {
      return NextResponse.json({ error: 'Email or password is incorrect, or sign-in is temporarily locked.' }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(adminSessionCookieName(), result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Admin sign-in failed.', { code });
    return NextResponse.json({ error: 'Admin sign-in is temporarily unavailable.' }, { status: 503 });
  }
}
