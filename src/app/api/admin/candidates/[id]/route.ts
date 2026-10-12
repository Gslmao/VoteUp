import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { deleteCandidate, updateCandidate } from '@/lib/procedures';
import { updateCandidateSchema } from '@/lib/validation';

export const runtime = 'nodejs';

function parseCandidateId(id: string): number | null {
  const candidateId = Number(id);
  return Number.isInteger(candidateId) && candidateId > 0 ? candidateId : null;
}

async function patchHandler(
  request: Request,
  candidateId: number,
  adminId: number
) {
  try {
    const body = await request.json();
    const parsed = updateCandidateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const candidate = await updateCandidate(adminId, candidateId, parsed.data);
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }
    return NextResponse.json({ candidate });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Invalid party or constituency' },
          { status: 400 }
        );
      }
      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Candidate must be at least 25 years old' },
          { status: 400 }
        );
      }
      if (error.code === 'VT003') {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
      if (error.code === 'VT008') {
        return NextResponse.json(
          { error: 'Candidate details cannot be changed after votes have been recorded' },
          { status: 409 }
        );
      }
    }
    console.error('Error updating candidate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function deleteHandler(candidateId: number, adminId: number) {
  try {
    await deleteCandidate(adminId, candidateId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === 'VT003') {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }
      if (error.code === 'VT008' || error.code === '23503') {
        return NextResponse.json(
          { error: 'Candidate cannot be deleted after votes have been recorded' },
          { status: 409 }
        );
      }
    }
    console.error('Error deleting candidate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidateId = parseCandidateId(id);
  if (candidateId === null) {
    return NextResponse.json({ error: 'Invalid candidate ID' }, { status: 400 });
  }
  return withAdminAuth((authorizedRequest, admin) =>
    patchHandler(authorizedRequest, candidateId, admin.adminId)
  )(request);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidateId = parseCandidateId(id);
  if (candidateId === null) {
    return NextResponse.json({ error: 'Invalid candidate ID' }, { status: 400 });
  }
  return withAdminAuth((_authorizedRequest, admin) =>
    deleteHandler(candidateId, admin.adminId)
  )(request);
}
