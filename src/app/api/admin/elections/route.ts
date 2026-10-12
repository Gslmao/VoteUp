import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { adminCreateElection, getElections } from '@/lib/procedures';
import { createElectionSchema } from '@/lib/electionValidation';

export const runtime = 'nodejs';

async function getHandler() {
  try {
    const result = await getElections();
    return NextResponse.json(result.rows, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Error fetching admin elections:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function postHandler(
  request: Request,
  admin: { adminId: number }
) {
  try {
    const body = await request.json();
    const parsed = createElectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const result = await adminCreateElection(admin.adminId, parsed.data);
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      if (error.code === '23514') {
        return NextResponse.json({ error: 'Invalid election type or dates' }, { status: 400 });
      }
    }
    console.error('Error creating election:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAdminAuth(async () => getHandler());
export const POST = withAdminAuth(async (request, admin) =>
  postHandler(request, admin)
);
