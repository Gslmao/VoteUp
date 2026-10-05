import { NextResponse } from 'next/server';
import { castVote } from '@/lib/procedures';
import { castVoteSchema } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = castVoteSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    await castVote(parsed.data);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error casting vote:', err);
    
    if (err.message?.includes('already voted') || err.code === '23505') {
      return NextResponse.json(
        { error: 'Voter has already voted in this election' },
        { status: 409 }
      );
    }
    
    if (err.message?.includes('invalid') || err.message?.includes('not found')) {
      return NextResponse.json(
        { error: err.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}