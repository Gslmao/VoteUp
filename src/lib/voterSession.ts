import { SignJWT, jwtVerify } from 'jose';

const COOKIE_NAME = 'voter_session';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

export async function createVoterSession(voterId: number) {
  return new SignJWT({ role: 'voter' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(voterId))
    .setAudience('voter')
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());
}

export async function getVoterIdFromSession(request: Request) {
  const cookie = request.headers.get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: 'voter' });
    const voterId = Number(payload.sub);
    return payload.role === 'voter' && Number.isInteger(voterId) && voterId > 0
      ? voterId
      : null;
  } catch {
    return null;
  }
}

export { COOKIE_NAME as VOTER_SESSION_COOKIE };