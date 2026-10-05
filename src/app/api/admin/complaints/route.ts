import { NextResponse } from 'next/server';
import { getComplaints, createComplaint } from '@/lib/procedures';
import { createComplaintSchema } from '@/lib/validation';

export async function GET() {
  try {
    const result = await getComplaints();
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching complaints:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createComplaintSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const result = await createComplaint(parsed.data);
    return NextResponse.json({ success: true, complaint: result.rows[0] });
  } catch (err: any) {
    console.error('Error creating complaint:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}