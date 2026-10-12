import { NextResponse } from 'next/server';
import { getVoterCandidates } from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const electionParam = params.get('electionId');
  const constituencyParam = params.get('constituencyId');
  const electionId = electionParam === null ? undefined : Number(electionParam);
  const constituencyId =
    constituencyParam === null ? undefined : Number(constituencyParam);

  if (
    (electionId !== undefined &&
      (!Number.isInteger(electionId) || electionId < 1)) ||
    (constituencyId !== undefined &&
      (!Number.isInteger(constituencyId) || constituencyId < 1))
  ) {
    return NextResponse.json({ error: 'Invalid election or constituency ID' }, { status: 400 });
  }

  try {
    const result = await getVoterCandidates(electionId, constituencyId);
    return NextResponse.json(result.rows, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Error fetching voter candidates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
