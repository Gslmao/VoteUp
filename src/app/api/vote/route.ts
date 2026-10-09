import { NextResponse } from 'next/server';
import { castVote } from '@/lib/procedures';
import { castVoteSchema } from '@/lib/validation';
import { getVoterIdFromSession } from '@/lib/voterSession';

export const runtime = 'nodejs';

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

    const voterId = await getVoterIdFromSession(request);
    if (!voterId) {
      return NextResponse.json({ error: 'Voter session required' }, { status: 401 });
    }

    await castVote({ ...parsed.data, voterId });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error casting vote:', err);
    const message = err instanceof Error ? err.message : '';
    if (message.includes('already voted')) {
      return NextResponse.json(
        { error: 'Voter has already voted in this election' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}