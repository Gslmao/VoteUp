import { NextResponse } from 'next/server';
import { getElections } from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await getElections('ONGOING');
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching elections:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}