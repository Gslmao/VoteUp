import { NextResponse } from 'next/server';
import { getLiveTurnout } from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ constituencyId: string }> }
) {
  try {
    const { constituencyId } = await params;
    const id = Number(constituencyId);
    
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: 'Invalid constituency ID' }, { status: 400 });
    }
    
    const electionParam = new URL(request.url).searchParams.get('electionId');
    const electionId = Number(electionParam);
    if (!electionParam || !Number.isInteger(electionId) || electionId < 1) {
      return NextResponse.json({ error: 'Valid electionId query parameter required' }, { status: 400 });
    }

    const result = await getLiveTurnout(id, electionId);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching turnout:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}