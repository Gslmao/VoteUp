import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { mutateReference } from '@/lib/adminReferenceApi';

export const runtime = 'nodejs';

type Context = { params: Promise<{ entity: string; id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { entity, id } = await params;
  const recordId = Number(id);
  if (!Number.isInteger(recordId) || recordId < 1) {
    return NextResponse.json({ error: 'Invalid record ID' }, { status: 400 });
  }
  return withAdminAuth(async (_authorizedRequest, admin) =>
    mutateReference(request, admin.adminId, entity, 'UPDATE', recordId)
  )(request);
}

export async function DELETE(request: Request, { params }: Context) {
  const { entity, id } = await params;
  const recordId = Number(id);
  if (!Number.isInteger(recordId) || recordId < 1) {
    return NextResponse.json({ error: 'Invalid record ID' }, { status: 400 });
  }
  return withAdminAuth(async (_authorizedRequest, admin) =>
    mutateReference(request, admin.adminId, entity, 'DELETE', recordId)
  )(request);
}
