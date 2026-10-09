import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/procedures';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { config, getAdminSetupKey } from '@/lib/config';

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  setupKey: z.string(),
});

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = setupSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const setupKey = getAdminSetupKey();
    if (!setupKey) {
      return NextResponse.json({ error: 'Admin setup is not configured' }, { status: 503 });
    }

    if (parsed.data.setupKey !== setupKey) {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, config.auth.bcryptRounds);
    
    const result = await createAdmin({
      email: parsed.data.email,
      passwordHash,
    });

    return NextResponse.json({ 
      success: true, 
      admin: result.rows[0],
      message: 'Admin created. You can now login at /api/admin/login'
    });
  } catch (err: unknown) {
    console.error('Admin setup error:', err);
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
      return NextResponse.json(
        { error: 'Admin setup is already initialized' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}