import { NextResponse } from 'next/server';
import { getComplaints } from '@/lib/procedures';
import { withAdminAuth } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function getHandler() {
  try {
    const result = await getComplaints();
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAdminAuth(async () => getHandler());