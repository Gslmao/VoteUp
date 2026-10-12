import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { isReferenceCollection } from '@/lib/adminReferenceApi';
import {
  getAdminObservers,
  getConstituencies,
  getParties,
  getStates,
} from '@/lib/procedures';
import { mutateReference } from '@/lib/adminReferenceApi';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;
  if (!isReferenceCollection(entity)) {
    return NextResponse.json({ error: 'Unsupported reference type' }, { status: 404 });
  }
  return withAdminAuth(async () => {
    try {
      const result = entity === 'parties'
        ? await getParties()
        : entity === 'constituencies'
          ? await getConstituencies()
          : entity === 'observers'
            ? await getAdminObservers()
            : await getStates();
      return NextResponse.json(result.rows, {
        headers: { 'Cache-Control': 'private, no-store' },
      });
    } catch (error) {
      console.error(`Error fetching ${entity}:`, error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  })(_request);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ entity: string }> }
) {
  const { entity } = await params;
  return withAdminAuth(async (authorizedRequest, admin) =>
    mutateReference(authorizedRequest, admin.adminId, entity, 'CREATE', null)
  )(_request);
}
