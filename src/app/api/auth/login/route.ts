import { NextResponse } from 'next/server';
import { getVoterByCredentials } from '@/lib/procedures';
import { voterLoginSchema } from '@/lib/validation';
import { createToken } from '@/lib/auth';
import { config, getSessionCookieOptions } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = voterLoginSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const voter = await getVoterByCredentials(parsed.data.epicNumber, parsed.data.dob);
    if (!voter) {
      return NextResponse.json({ error: 'Invalid voter credentials' }, { status: 401 });
    }

    const voterId = voter.voter_id;
    const token = await createToken({ role: 'voter', voterId });
    const response = NextResponse.json({ success: true });
    response.cookies.set(config.auth.cookies.voter, token, getSessionCookieOptions());
    return response;
  } catch (err: unknown) {
    console.error('Error logging in voter:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}