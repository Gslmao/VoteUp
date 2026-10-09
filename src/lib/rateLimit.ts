import { config } from './config';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, RateLimitEntry>();

function consumeRateLimit(key: string, limit: number, windowMs: number, now: number) {
  for (const [entryKey, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(entryKey);
  }

  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function consumeComplaintRateLimit(voterId: number, now = Date.now()) {
  return consumeRateLimit(
    `complaint:${voterId}`,
    config.complaints.rateLimit.limit,
    config.complaints.rateLimit.windowMs,
    now
  );
}

export function consumeVoterLoginRateLimit(epicNumber: string, now = Date.now()) {
  return consumeRateLimit(
    `voter-login:${epicNumber.trim().toUpperCase()}`,
    config.auth.voterLoginRateLimit.limit,
    config.auth.voterLoginRateLimit.windowMs,
    now
  );
}