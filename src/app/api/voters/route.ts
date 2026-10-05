import { NextResponse } from 'next/server';
import { createVoter } from '@/lib/procedures';
import { createVoterSchema } from '@/lib/validation';

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
    return NextResponse.json({ success: true, voterId: result.rows[0].id });
  } catch (err: any) {
    console.error('Error creating voter:', err);
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'Voter with this ID document already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}