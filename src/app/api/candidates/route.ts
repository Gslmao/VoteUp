import { NextResponse } from 'next/server';
import { getCandidates, createCandidate } from '@/lib/procedures';
import { createCandidateSchema } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    
    const result = await getCandidates(electionId ? Number(electionId) : undefined);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching candidates:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCandidateSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const result = await createCandidate(parsed.data);
    return NextResponse.json({ success: true, candidate: result });
  } catch (err: any) {
    console.error('Error creating candidate:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}