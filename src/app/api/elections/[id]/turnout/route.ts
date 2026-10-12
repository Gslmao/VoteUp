import { NextResponse } from 'next/server';
import { getElectionTurnout } from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const electionId = Number(id);
    if (!Number.isInteger(electionId) || electionId < 1) {
      return NextResponse.json({ error: 'Invalid election ID' }, { status: 400 });
    }
    const result = await getElectionTurnout(electionId);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching election turnout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
