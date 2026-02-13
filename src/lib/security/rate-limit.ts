type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

const STORE_KEY = "__eventsarRateLimitStore";

function getStore(): Map<string, RateLimitBucket> {
  const g = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, RateLimitBucket>;
  };

  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new Map<string, RateLimitBucket>();
  }

  return g[STORE_KEY];
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
      remaining: Math.max(options.max - 1, 0),
    };
  }

  if (existing.count >= options.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
      remaining: 0,
    };
  }

  existing.count += 1;
  store.set(key, existing);

  if (store.size > 10_000) {
    for (const [storeKey, bucket] of store.entries()) {
      if (now >= bucket.resetAt) store.delete(storeKey);
    }
  }

  return {
    allowed: true,
    retryAfterSeconds: Math.max(Math.ceil((existing.resetAt - now) / 1000), 1),
    remaining: Math.max(options.max - existing.count, 0),
  };
}
