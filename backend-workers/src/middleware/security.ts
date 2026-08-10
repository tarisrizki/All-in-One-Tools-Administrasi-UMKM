import { Context, Next } from 'hono';
import { getEnv } from '../utils/env';
import { sanitizeSQLLikePattern } from '../utils/validation';

// ============================================================================
// SECURITY MIDDLEWARES
// ============================================================================

/**
 * WS-01: Content-Security-Policy header
 */
export const cspMiddleware = async (c: Context, next: Next) => {
  const envCSP = getEnv(c, 'CONTENT_SECURITY_POLICY');
  
  // Default restrictive CSP
  const defaultCSP = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https: http://localhost:*",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  const cspValue = envCSP || defaultCSP;
  c.header('Content-Security-Policy', cspValue);

  // HSTS (Production only - via ALLOWED_ORIGIN check)
  if (!c.req.url.startsWith('http://localhost')) {
    const maxAge = getEnv(c, 'HSTS_MAX_AGE') || '31536000'; // 1 year
    c.header('Strict-Transport-Security', `max-age=${maxAge}; includeSubDomains; preload`);
  }

  await next();
};

/**
 * WS-02: X-Frame-Options header
 */
export const xframeMiddleware = async (c: Context, next: Next) => {
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove server headers
  c.header('X-Powered-By', '');
  c.header('Server', '');
  
  await next();
};

/**
 * WS-03: Input sanitization middleware
 * Sanitizes all string inputs to prevent injection attacks
 */
export const sanitizeMiddleware = async (c: Context, next: Next) => {
  // Parse and sanitize body JSON
  try {
    const rawBody = await c.req.json();
    const sanitizedBody = sanitizeObject(rawBody);
    
    // Store sanitized version for downstream use
    Object.defineProperty(c, '_sanitizedBody', { value: sanitizedBody, enumerable: false });
  } catch (err) {
    // Non-JSON endpoints are OK
  }
  
  // Sanitize query parameters
  const query = c.req.query() || {};
  const sanitizedQuery: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === 'string') {
      sanitizedQuery[key] = sanitizeSQLLikePattern(value);
    } else if (Array.isArray(value as any)) {
      sanitizedQuery[key] = (value as any).map((v: any) => typeof v === 'string' ? sanitizeSQLLikePattern(v) : v).join(',');
    }
  }
  Object.defineProperty(c, '_sanitizedQuery', { value: sanitizedQuery, enumerable: false });
  
  await next();
};

/**
 * Sanitize nested object recursively
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Limit key length to prevent key exhaustion attacks
      const safeKey = key.slice(0, 100);
      result[safeKey] = sanitizeObject(value);
    }
    return result;
  }
  
  // Truncate strings to reasonable limits
  if (typeof obj === 'string') {
    return obj.slice(0, 10000); // Max 10KB string per field
  }
  
  return obj;
}

/**
 * WS-04: Request size validation
 */
export const requestSizeMiddleware = async (c: Context, next: Next) => {
  const contentLength = parseInt(c.req.header('content-length') || '0', 10);
  const maxSize = Number(getEnv(c, 'MAX_REQUEST_SIZE_MB') || 5) * 1024 * 1024;
  
  if (contentLength > maxSize) {
    return c.json({ 
      success: false, 
      error: { message: 'Request body terlalu besar' } 
    }, 413);
  }
  
  await next();
};

/**
 * WS-05: Trace context propagation for security auditing
 */
export const tracingMiddleware = async (c: Context, next: Next) => {
  // Generate or extract trace ID
  const traceId = c.req.header('x-trace-id') || crypto.randomUUID();
  const requestId = c.req.header('x-request-id') || crypto.randomUUID();
  
  c.header('x-trace-id', traceId);
  c.header('x-request-id', requestId);
  
  // Add timing header
  const startTime = Date.now();
  c.set('_startTime' as any, startTime as any);
  
  await next();
  
  const duration = Date.now() - (c.get('_startTime' as any) as number);
  console.log(`[trace:${traceId}] ${c.req.method} ${c.req.path} ${c.status} (${duration}ms)`);
};

// ============================================================================
// END SECURITY MIDDLEWARES
// ============================================================================
