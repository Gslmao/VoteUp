import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { updateVoter } from '@/lib/procedures';
import { updateVoterSchema } from '@/lib/validation';

export const runtime = 'nodejs';

async function patchHandler(request: Request, voterId: number) {
  try {
    const body = await request.json();
    const parsed = updateVoterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const voter = await updateVoter(voterId, {
      epicNumber: parsed.data.epicNumber,
      fullName: parsed.data.fullName,
      dob: parsed.data.dob,
      constituencyId: parsed.data.constituencyId,
    });
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }
    return NextResponse.json({ voter });
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
    console.error('Error updating voter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const voterId = Number(id);
  if (!Number.isInteger(voterId) || voterId < 1) {
    return NextResponse.json({ error: 'Invalid voter ID' }, { status: 400 });
  }
  return withAdminAuth(async (authorizedRequest) =>
    patchHandler(authorizedRequest, voterId)
  )(request);
}
