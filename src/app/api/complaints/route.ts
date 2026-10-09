import { NextResponse } from 'next/server';
import { getVoterIdFromSession } from '@/lib/auth';
import { createComplaint } from '@/lib/procedures';
import { consumeComplaintRateLimit } from '@/lib/rateLimit';
import { voterComplaintSchema } from '@/lib/validation';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const voterId = await getVoterIdFromSession(request);
  if (!voterId) {
    return NextResponse.json({ error: 'Voter session required' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = voterComplaintSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const rateLimit = consumeComplaintRateLimit(voterId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Complaint rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
    );
  }

  try {
    const result = await createComplaint({ ...parsed.data, voterId });
    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Voter account not found' }, { status: 401 });
    }
    return NextResponse.json({ success: true, complaint: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating voter complaint:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}