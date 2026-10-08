import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/procedures';
import { z } from 'zod';

const setupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  setupKey: z.string(),
});

const SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'change-me-in-production';

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

    if (parsed.data.setupKey !== SETUP_KEY) {
      return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 });
    }

    const passwordHash = await Bun.password.hash(parsed.data.password);
    
    const result = await createAdmin({
      email: parsed.data.email,
      passwordHash,
    });

    return NextResponse.json({ 
      success: true, 
      admin: result.rows[0],
      message: 'Admin created. You can now login at /api/admin/login' 
    });
  } catch (err: any) {
    console.error('Admin setup error:', err);
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}