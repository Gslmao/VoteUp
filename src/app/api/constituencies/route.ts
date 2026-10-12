import { NextResponse } from 'next/server';
import { getConstituencies } from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await getConstituencies();
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching constituencies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
