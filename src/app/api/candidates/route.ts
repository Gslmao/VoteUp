import { NextResponse } from 'next/server';
import { getCandidates, createCandidate } from '@/lib/procedures';
import { createCandidateSchema } from '@/lib/validation';
import { withAdminAuth } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const constituencyParam = searchParams.get('constituencyId');
    const constituencyId = constituencyParam === null ? undefined : Number(constituencyParam);
    if (constituencyId !== undefined && (!Number.isInteger(constituencyId) || constituencyId < 1)) {
      return NextResponse.json({ error: 'Invalid constituency ID' }, { status: 400 });
    }

    const result = await getCandidates(constituencyId);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching candidates:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function postHandler(request: Request) {
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
  } catch (err: unknown) {
    console.error('Error creating candidate:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withAdminAuth(async (request) => postHandler(request));