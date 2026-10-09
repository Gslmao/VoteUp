type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const complaintWindowMs = 15 * 60 * 1000;
const complaintLimit = 3;
const complaintAttempts = new Map<number, RateLimitEntry>();

export function consumeComplaintRateLimit(voterId: number, now = Date.now()) {
  for (const [key, entry] of complaintAttempts) {
    if (entry.resetAt <= now) complaintAttempts.delete(key);
  }

  const current = complaintAttempts.get(voterId);
  if (!current || current.resetAt <= now) {
    complaintAttempts.set(voterId, { count: 1, resetAt: now + complaintWindowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= complaintLimit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}