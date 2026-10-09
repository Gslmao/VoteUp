import { SignJWT, jwtVerify } from 'jose';

const JWT_EXPIRY = '8h';

export type TokenRole = 'admin' | 'voter';
export type AdminTokenPayload = { role: 'admin'; adminId: number; email: string };
export type VoterTokenPayload = { role: 'voter'; voterId: number };

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

export async function createToken(payload: AdminTokenPayload | VoterTokenPayload) {
  const subject = payload.role === 'admin' ? payload.adminId : payload.voterId;
  const claims = payload.role === 'admin'
    ? { role: payload.role, adminId: payload.adminId, email: payload.email }
    : { role: payload.role };

  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(payload.role)
    .setSubject(String(subject))
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string, expectedRole: 'admin'): Promise<AdminTokenPayload | null>;
export async function verifyToken(token: string, expectedRole: 'voter'): Promise<VoterTokenPayload | null>;
export async function verifyToken(
  token: string,
  expectedRole: TokenRole
): Promise<AdminTokenPayload | VoterTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { audience: expectedRole });
    if (payload.role !== expectedRole) return null;

    const subjectId = Number(payload.sub);
    if (!Number.isInteger(subjectId) || subjectId < 1) return null;

    if (expectedRole === 'admin') {
      if (
        typeof payload.adminId !== 'number' ||
        payload.adminId !== subjectId ||
        typeof payload.email !== 'string'
      ) return null;
      return { role: 'admin', adminId: payload.adminId, email: payload.email };
    }

    return { role: 'voter', voterId: subjectId };
  } catch {
    return null;
  }
}

export function getTokenFromHeader(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function getVoterIdFromSession(request: Request) {
  const token = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('voter_session='))
    ?.slice('voter_session='.length);
  if (!token) return null;

  const payload = await verifyToken(token, 'voter');
  return payload?.voterId ?? null;
}
