import { NextResponse } from 'next/server';
import { getBooths, createBooth } from '@/lib/procedures';
import { createBoothSchema } from '@/lib/validation';
import { withAdminAuth } from '@/lib/adminAuth';

export const runtime = 'nodejs';

async function getHandler() {
  try {
    const result = await getBooths();
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching booths:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function postHandler(request: Request) {
  try {
    const body = await request.json();
    const parsed = createBoothSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const result = await createBooth(parsed.data);
    return NextResponse.json({ success: true, booth: result.rows[0] });
  } catch (err: unknown) {
    console.error('Error creating booth:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAdminAuth(async () => getHandler());
export const POST = withAdminAuth(async (req) => postHandler(req));