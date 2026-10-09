const sessionLifetimeSeconds = 8 * 60 * 60;

export const config = {
  auth: {
    jwtExpiresIn: `${sessionLifetimeSeconds}s`,
    sessionLifetimeSeconds,
    bcryptRounds: 12,
    voterLoginRateLimit: {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    },
    cookies: {
      admin: 'admin_token',
      voter: 'voter_session',
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
    },
  },
  complaints: {
    rateLimit: {
      limit: 3,
      windowMs: 15 * 60 * 1000,
    },
  },
} as const;

export function getAdminSetupKey() {
  return process.env.ADMIN_SETUP_KEY;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: config.auth.cookies.httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: config.auth.cookies.sameSite,
    maxAge: config.auth.sessionLifetimeSeconds,
    path: config.auth.cookies.path,
  } as const;
}
