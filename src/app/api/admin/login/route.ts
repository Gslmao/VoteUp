import { NextResponse } from 'next/server';
import { getAdminByEmail } from '@/lib/procedures';
import { createToken } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { config, getSessionCookieOptions } from '@/lib/config';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = await getAdminByEmail(parsed.data.email);
    
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(parsed.data.password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createToken({ role: 'admin', adminId: admin.id, email: admin.email });

    const response = NextResponse.json({ success: true });
    response.cookies.set(config.auth.cookies.admin, token, getSessionCookieOptions());

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(config.auth.cookies.admin, '', {
    ...getSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}