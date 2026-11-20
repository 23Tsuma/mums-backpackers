import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  AdminAuthConfigurationError,
  AdminSetupCompleteError,
  AdminSetupTokenError,
  createInitialAdmin,
  isAdminSetupConfigured,
  isSameOriginRequest,
} from '@/lib/server/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const setupSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(12).max(128),
  setupToken: z.string().min(1).max(256),
}).strict();

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (Number(request.headers.get('content-length') ?? '0') > 10000) {
    return NextResponse.json({ error: 'The request is too large.' }, { status: 413 });
  }
  if (!isAdminSetupConfigured()) {
    return NextResponse.json({ error: 'Admin setup is not configured on this server.' }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Please submit valid setup details.' }, { status: 400 });
  }
  const parsed = setupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Use a valid email address and a password of at least 12 characters.' }, { status: 400 });
  }

  try {
    await createInitialAdmin(parsed.data.email, parsed.data.password, parsed.data.setupToken);
    return NextResponse.json({ created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminSetupCompleteError) {
      return NextResponse.json({ error: 'Admin setup has already been completed.' }, { status: 409 });
    }
    if (error instanceof AdminSetupTokenError) {
      return NextResponse.json({ error: 'The setup token is not valid.' }, { status: 403 });
    }
    if (error instanceof AdminAuthConfigurationError) {
      return NextResponse.json({ error: 'Admin setup is not configured on this server.' }, { status: 503 });
    }

    const code = error instanceof Error && 'code' in error ? String(error.code) : 'UnknownError';
    console.error('Initial admin account setup failed.', { code });
    return NextResponse.json({ error: 'Admin setup could not be completed. Check the server configuration and try again.' }, { status: 503 });
  }
}
