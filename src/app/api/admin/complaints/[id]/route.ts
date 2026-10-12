import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAdminAuth } from '@/lib/adminAuth';
import { adminSetComplaintStatus } from '@/lib/procedures';

const complaintStatusSchema = z.object({
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED']),
}).strict();

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const complaintId = Number(id);
  if (!Number.isInteger(complaintId) || complaintId < 1) {
    return NextResponse.json({ error: 'Invalid complaint ID' }, { status: 400 });
  }

  return withAdminAuth(async (authorizedRequest, admin) => {
    try {
      let body: unknown;
      try {
        body = await authorizedRequest.json();
      } catch {
        return NextResponse.json(
          { error: 'Request body must be valid JSON' },
          { status: 400 }
        );
      }
      const parsed = complaintStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid input', details: parsed.error.flatten() },
          { status: 400 }
        );
      }
      const result = await adminSetComplaintStatus(
        admin.adminId,
        complaintId,
        parsed.data.status
      );
      if (!result.rows.length) {
        return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating complaint status:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(request);
}
