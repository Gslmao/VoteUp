import { NextResponse } from 'next/server';
import { config, getSessionCookieOptions } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(config.auth.cookies.voter, '', {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
