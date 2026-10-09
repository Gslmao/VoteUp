import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeader } from './auth';
import { config } from './config';

export async function requireAdmin(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${config.auth.cookies.admin}=`))
    ?.slice(config.auth.cookies.admin.length + 1);
  
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