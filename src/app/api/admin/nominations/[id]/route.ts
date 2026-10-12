import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { adminSetNominationStatus } from '@/lib/procedures';
import { z } from 'zod';

const nominationStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'WITHDRAWN']),
}).strict();

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const nominationId = Number(id);
  if (!Number.isInteger(nominationId) || nominationId < 1) {
    return NextResponse.json({ error: 'Invalid nomination ID' }, { status: 400 });
  }

  return withAdminAuth(async (authorizedRequest, admin) => {
    try {
      const body = await authorizedRequest.json();
      const parsed = nominationStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = await adminSetNominationStatus(
        admin.adminId,
        nominationId,
        parsed.data.status
      );
      return NextResponse.json(result.rows[0]);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        if (error.code === 'VT007') {
          return NextResponse.json({ error: 'Nomination not found' }, { status: 404 });
        }
        if (error.code === 'VT008') {
          return NextResponse.json(
            { error: 'Nomination status transition is not allowed' },
            { status: 409 }
          );
        }
      }
      console.error('Error updating nomination:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}
