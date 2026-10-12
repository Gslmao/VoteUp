import { NextResponse } from 'next/server';
import { getParties } from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await getParties();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching parties:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
