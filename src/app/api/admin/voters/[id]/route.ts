import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { deleteVoter, updateVoter } from '@/lib/procedures';
import { updateVoterSchema } from '@/lib/validation';

export const runtime = 'nodejs';

async function patchHandler(
  request: Request,
  voterId: number,
  admin: { adminId: number }
) {
  try {
    const body = await request.json();
    const parsed = updateVoterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const voter = await updateVoter(admin.adminId, voterId, {
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
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A voter with this EPIC number already exists' },
          { status: 409 }
        );
      }
      if (error.code === '23503') {
        return NextResponse.json({ error: 'Invalid constituency' }, { status: 400 });
      }
      if (error.code === 'VT001') {
        return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
      }
      if (error.code === 'VT008') {
        return NextResponse.json(
          { error: 'Voter details cannot be changed after participation has been recorded' },
          { status: 409 }
        );
      }
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
  return withAdminAuth(async (authorizedRequest, admin) =>
    patchHandler(authorizedRequest, voterId, admin)
  )(request);
}

async function deleteHandler(voterId: number, admin: { adminId: number }) {
  try {
    await deleteVoter(admin.adminId, voterId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23503'
    ) {
      return NextResponse.json(
        { error: 'Voter cannot be deleted because participation records reference them' },
        { status: 409 }
      );
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'VT001'
    ) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }
    console.error('Error deleting voter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const voterId = Number(id);
  if (!Number.isInteger(voterId) || voterId < 1) {
    return NextResponse.json({ error: 'Invalid voter ID' }, { status: 400 });
  }
  return withAdminAuth(async (_authorizedRequest, admin) =>
    deleteHandler(voterId, admin)
  )(request);
}
