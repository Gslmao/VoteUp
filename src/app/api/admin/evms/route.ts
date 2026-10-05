import { NextResponse } from 'next/server';
import { getEVMs, createEVM } from '@/lib/procedures';
import { createEVMSchema } from '@/lib/validation';

export async function GET() {
  try {
    const result = await getEVMs();
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('Error fetching EVMs:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createEVMSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const result = await createEVM(parsed.data);
    return NextResponse.json({ success: true, evm: result.rows[0] });
  } catch (err: any) {
    console.error('Error creating EVM:', err);
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'EVM with this serial number already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}