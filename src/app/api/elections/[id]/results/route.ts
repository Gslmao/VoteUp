import { NextResponse } from 'next/server';
import { getElectionResults } from '@/lib/procedures';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const electionId = Number(id);
    
    if (isNaN(electionId)) {
      return NextResponse.json({ error: 'Invalid election ID' }, { status: 400 });
    }
    
    const result = await getElectionResults(electionId);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching election results:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}