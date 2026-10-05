import { NextResponse } from 'next/server';
import { getLiveTurnout } from '@/lib/procedures';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ constituencyId: string }> }
) {
  try {
    const { constituencyId } = await params;
    const id = Number(constituencyId);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid constituency ID' }, { status: 400 });
    }
    
    const result = await getLiveTurnout(id);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching turnout:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}