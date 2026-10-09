import { NextResponse } from 'next/server';
import { getResultsLeaderboard } from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const electionId = Number(id);
    
    if (!Number.isInteger(electionId) || electionId < 1) {
      return NextResponse.json({ error: 'Invalid election ID' }, { status: 400 });
    }
    
    const constituencyParam = new URL(request.url).searchParams.get('constituencyId');
    const constituencyId = constituencyParam === null ? undefined : Number(constituencyParam);
    if (constituencyId !== undefined && (!Number.isInteger(constituencyId) || constituencyId < 1)) {
      return NextResponse.json({ error: 'Invalid constituency ID' }, { status: 400 });
    }

    const result = await getResultsLeaderboard(electionId, constituencyId);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching election results:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}