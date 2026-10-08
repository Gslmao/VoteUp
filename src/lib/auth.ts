import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);
const JWT_EXPIRY = '8h';

export async function createToken(payload: { adminId: number; email: string }) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { adminId: number; email: string };
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}