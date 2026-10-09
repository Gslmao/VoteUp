import { config } from './config';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const complaintAttempts = new Map<number, RateLimitEntry>();

export function consumeComplaintRateLimit(voterId: number, now = Date.now()) {
  for (const [key, entry] of complaintAttempts) {
    if (entry.resetAt <= now) complaintAttempts.delete(key);
  }

  const current = complaintAttempts.get(voterId);
  if (!current || current.resetAt <= now) {
    complaintAttempts.set(voterId, {
      count: 1,
      resetAt: now + config.complaints.rateLimit.windowMs,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= config.complaints.rateLimit.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}