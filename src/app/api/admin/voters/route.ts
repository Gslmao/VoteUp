import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { createVoter, getAdminVoters, getElections } from '@/lib/procedures';
import { createVoterSchema } from '@/lib/validation';

export const runtime = 'nodejs';

async function getHandler(request: Request) {
  try {
    const electionParam = new URL(request.url).searchParams.get('electionId');
    const electionId =
      electionParam === null ? undefined : Number(electionParam);
    if (
      electionId !== undefined &&
      (!Number.isInteger(electionId) || electionId < 1)
    ) {
      return NextResponse.json({ error: 'Invalid election ID' }, { status: 400 });
    }

    if (electionId !== undefined) {
      const elections = await getElections();
      if (!elections.rows.some((election) => election.election_id === electionId)) {
        return NextResponse.json({ error: 'Election not found' }, { status: 404 });
      }
    }

    const result = await getAdminVoters(electionId);
    return NextResponse.json(result.rows, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Error fetching admin voter directory:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function postHandler(request: Request) {
  try {
    const body = await request.json();
    const parsed = createVoterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const voter = await createVoter({
      epicNumber: parsed.data.epicNumber,
      fullName: parsed.data.fullName,
      dob: parsed.data.dob,
      constituencyId: parsed.data.constituencyId,
    });
    return NextResponse.json({ voter }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      return NextResponse.json(
        { error: 'A voter with this EPIC number already exists' },
        { status: 409 }
      );
    }
    console.error('Error creating voter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAdminAuth(async (request) => getHandler(request));
export const POST = withAdminAuth(async (request) => postHandler(request));
