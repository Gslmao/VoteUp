import { NextResponse } from 'next/server';
import { getVoterIdFromSession } from '@/lib/auth';
import {
  getVoterComplaints,
  getVoterHistory,
  getVoterProfile,
} from '@/lib/procedures';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const voterId = await getVoterIdFromSession(request);
  if (!voterId) {
    return NextResponse.json({ error: 'Voter session required' }, { status: 401 });
  }

  try {
    const profile = await getVoterProfile(voterId);
    if (!profile) {
      return NextResponse.json({ error: 'Voter account not found' }, { status: 404 });
    }

    const [history, complaints] = await Promise.all([
      getVoterHistory(voterId),
      getVoterComplaints(voterId),
    ]);

    return NextResponse.json(
      { profile, history: history.rows, complaints: complaints.rows },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Error fetching voter account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
