import { NextResponse } from 'next/server';
import { createVoter } from '@/lib/procedures';
import { createVoterSchema } from '@/lib/validation';
import { createToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createVoterSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const result = await createVoter(parsed.data);
    const voterId = result.rows[0].voter_id as number;
    const token = await createToken({ role: 'voter', voterId });
    const response = NextResponse.json({ success: true, voterId });
    response.cookies.set('voter_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    return response;
  } catch (err: unknown) {
    console.error('Error creating voter:', err);
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505') {
      return NextResponse.json(
        { error: 'Voter with this ID document already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}