import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import {
  adminDeleteElection,
  adminSetElectionStatus,
  adminUpdateElection,
} from '@/lib/procedures';
import {
  electionStatusSchema,
  updateElectionSchema,
} from '@/lib/electionValidation';

export const runtime = 'nodejs';

function parseElectionId(id: string): number | null {
  const electionId = Number(id);
  return Number.isInteger(electionId) && electionId > 0 ? electionId : null;
}

async function patchHandler(
  request: Request,
  electionId: number,
  admin: { adminId: number }
) {
  try {
    const body: unknown = await request.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'status' in body &&
      Object.keys(body).length === 1
    ) {
      const parsedStatus = electionStatusSchema.safeParse(body);
      if (!parsedStatus.success) {
        return NextResponse.json(
          { error: 'Invalid election status', details: parsedStatus.error.flatten() },
          { status: 400 }
        );
      }
      const result = await adminSetElectionStatus(
        admin.adminId,
        electionId,
        parsedStatus.data.status
      );
      return NextResponse.json(result.rows[0]);
    }

    const parsed = updateElectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const result = await adminUpdateElection(admin.adminId, electionId, parsed.data);
    return NextResponse.json(result.rows[0]);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === 'VT005') {
        return NextResponse.json({ error: 'Election not found' }, { status: 404 });
      }
      if (error.code === 'VT008') {
        return NextResponse.json(
          { error: 'This election cannot be changed in its current state' },
          { status: 409 }
        );
      }
      if (error.code === '23514') {
        return NextResponse.json({ error: 'Invalid election type or dates' }, { status: 400 });
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Election cannot be changed because dependent records reference it' },
          { status: 409 }
        );
      }
    }
    console.error('Error updating election:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function deleteHandler(
  electionId: number,
  admin: { adminId: number }
) {
  try {
    await adminDeleteElection(admin.adminId, electionId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === 'VT005') {
        return NextResponse.json({ error: 'Election not found' }, { status: 404 });
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Election cannot be deleted because records reference it' },
          { status: 409 }
        );
      }
    }
    console.error('Error deleting election:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const electionId = parseElectionId(id);
  if (electionId === null) {
    return NextResponse.json({ error: 'Invalid election ID' }, { status: 400 });
  }
  return withAdminAuth((authorizedRequest, admin) =>
    patchHandler(authorizedRequest, electionId, admin)
  )(request);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const electionId = parseElectionId(id);
  if (electionId === null) {
    return NextResponse.json({ error: 'Invalid election ID' }, { status: 400 });
  }
  return withAdminAuth((_authorizedRequest, admin) =>
    deleteHandler(electionId, admin)
  )(request);
}
