import { NextResponse } from 'next/server';
import { adminSessionCookieName, deleteAdminSession, isSameOriginRequest } from '@/lib/server/admin-auth';
import { isDatabaseConfigured } from '@/lib/server/mysql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Sign-out is temporarily unavailable.' }, { status: 503 });
  }

  try {
    const token = request.headers.get('cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${adminSessionCookieName()}=`))
      ?.slice(adminSessionCookieName().length + 1);
    await deleteAdminSession(token);
    const response = NextResponse.json({ signedOut: true });
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
    console.error('Admin sign-out failed.', { code });
    return NextResponse.json({ error: 'Sign-out could not be completed. Please try again.' }, { status: 503 });
  }
}
