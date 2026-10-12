import { NextResponse } from 'next/server';
import { getElections } from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const status = new URL(request.url).searchParams.get('status') ?? undefined;
    const allowedStatuses = ['SCHEDULED', 'ONGOING', 'COMPLETED'];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid election status' }, { status: 400 });
    }

    const result = await getElections(status);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching elections:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}