import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/adminAuth';
import { getAdminNominations } from '@/lib/procedures';

export const runtime = 'nodejs';

async function getHandler() {
  try {
    const result = await getAdminNominations();
    return NextResponse.json(result.rows, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Error fetching nominations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAdminAuth(async () => getHandler());
