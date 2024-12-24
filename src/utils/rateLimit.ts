type RateLimitStore = {
  [ip: string]: {
    count: number;
    lastReset: number;
  };
};

// In-memory store for rate limiting
const store: RateLimitStore = {};

// Rate limit window in seconds
const WINDOW_SIZE_IN_SECONDS = 60;
// Maximum number of requests per window
const MAX_REQUESTS_PER_WINDOW = 5;

export function getRateLimitInfo(ip: string) {
  const now = Date.now();
  const windowStart = now - (WINDOW_SIZE_IN_SECONDS * 1000);

  // Clean up old entries
  if (store[ip] && store[ip].lastReset < windowStart) {
    store[ip] = {
      count: 0,
      lastReset: now,
    };
  }

  // Initialize if not exists
  if (!store[ip]) {
    store[ip] = {
      count: 0,
      lastReset: now,
    };
  }

  return {
    current: store[ip].count,
    limit: MAX_REQUESTS_PER_WINDOW,
    remaining: Math.max(0, MAX_REQUESTS_PER_WINDOW - store[ip].count),
    reset: store[ip].lastReset + (WINDOW_SIZE_IN_SECONDS * 1000),
  };
}

export function incrementRateLimit(ip: string): boolean {
  const rateLimitInfo = getRateLimitInfo(ip);
  
  if (rateLimitInfo.remaining === 0) {
    return false;
  }

  store[ip].count += 1;
  return true;
}