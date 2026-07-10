import { Context, Next } from 'hono';

// In-memory cache for general rate limiting (Best effort, resets on isolate restart, 100% free)
const generalRateLimitCache = new Map<string, { count: number; resetAt: number }>();

export const rateLimitMiddleware = async (c: Context, next: Next) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const path = c.req.path;
  const now = Date.now();

  // 1. Strict limit for Auth endpoints (/auth/login & /auth/register)
  if (path === '/auth/login' || path === '/auth/register') {
    try {
      // Clone request to read body without consuming the stream for the actual handler
      const reqClone = c.req.raw.clone();
      const body = await reqClone.json() as any;
      const phone = body?.phone || 'unknown';
      
      const key = `rl:auth:${ip}:${phone}`;
      
      // We use KV for strict, cross-isolate rate limiting on auth endpoints
      // Note: KV free tier has 1,000 writes/day. We only write on auth attempts to save quota.
      const kv = c.env.RATE_LIMIT_KV;
      if (kv) {
        const recordStr = await kv.get(key);
        let record = recordStr ? JSON.parse(recordStr) : null;
        
        if (!record || now > record.resetAt) {
          record = { count: 1, resetAt: now + 15 * 60 * 1000 }; // 15 minutes
        } else {
          if (record.count >= 5) {
            return c.json({ 
              success: false, 
              error: { message: 'Terlalu banyak percobaan, coba lagi dalam beberapa menit' } 
            }, 429);
          }
          record.count += 1;
        }
        
        // Save back to KV with expiration (minimum TTL in KV is 60 seconds)
        const ttl = Math.max(60, Math.floor((record.resetAt - now) / 1000));
        await kv.put(key, JSON.stringify(record), { expirationTtl: ttl });
      }
    } catch (e) {
      // If parsing fails or KV fails, just fall through (let the handler deal with bad request)
      console.error('Rate limit auth error:', e);
    }
  } 
  // 2. General limit for other endpoints (100 req / minute per IP)
  else {
    const key = `rl:gen:${ip}`;
    let record = generalRateLimitCache.get(key);
    
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + 60 * 1000 }; // 1 minute
    } else {
      if (record.count >= 100) {
        return c.json({ 
          success: false, 
          error: { message: 'Terlalu banyak permintaan, coba lagi dalam beberapa menit' } 
        }, 429);
      }
      record.count += 1;
    }
    
    generalRateLimitCache.set(key, record);
    
    // Cleanup old cache entries occasionally to prevent memory leak
    if (Math.random() < 0.01) {
      for (const [k, v] of generalRateLimitCache.entries()) {
        if (now > v.resetAt) generalRateLimitCache.delete(k);
      }
    }
  }

  await next();
};
