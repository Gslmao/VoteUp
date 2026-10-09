import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from './auth';

export async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.headers.get('cookie')?.split('; ').find(c => c.startsWith('admin_token='))?.split('=')[1];
  
  const token = getTokenFromHeader(authHeader) || cookieToken;
  
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const payload = await verifyToken(token, 'admin');
  if (!payload) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  }

  return { payload };
}

export function withAdminAuth(handler: (request: Request, payload: { adminId: number; email: string }) => Promise<NextResponse>) {
  return async (request: Request) => {
    const auth = await requireAdmin(request);
    if (auth.error) return auth.error;
    return handler(request, auth.payload!);
  };
}