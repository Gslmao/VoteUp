import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { getAuditLog } from '@/lib/procedures';

export const runtime = 'nodejs';

export const GET = withAdminAuth(async (request) => {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get('limit') ?? 100);
  const offset = Number(url.searchParams.get('offset') ?? 0);
  if (
    !Number.isInteger(limit) || limit < 1 || limit > 200 ||
    !Number.isInteger(offset) || offset < 0
  ) {
    return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 });
  }
  try {
    const result = await getAuditLog(limit, offset);
    return NextResponse.json(result.rows, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
