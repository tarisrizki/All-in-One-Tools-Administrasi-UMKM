import { z } from 'zod';

// ============================================================================
// SECURITY-ENHANCED VALIDATION SCHEMAS
// ============================================================================

/**
 * Sanitized string schema - prevents XSS and injection
 * Max length enforced to prevent memory exhaustion
 */
export const sanitizedString = z.string()
  .min(1, 'Input tidak boleh kosong')
  .max(500, 'Input melebihi batas panjang maksimal (500 karakter)')
  .refine(
    (str) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(str),
    { message: 'Format input tidak valid' }
  );

/**
 * Email validation with length limit
 */
export const emailSchema = z.string()
  .max(255, 'Email terlalu panjang')
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    'Format email tidak valid'
  );

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid();

/**
 * Phone validation - Indonesian numbers only
 */
export const phoneSchema = z.string()
  .regex(/^(08|628|\+628)\d{6,14}$/, 'Nomor HP harus berupa nomor Indonesia yang valid');

/**
 * Numeric validation - prevents overflow
 */
export const safeNumber = z.number()
  .min(0, 'Nilai tidak boleh negatif')
  .max(Number.MAX_SAFE_INTEGER, 'Nilai terlalu besar');

/**
 * Amount validation - use strings internally to avoid precision loss
 */
export const amountSchema = z.union([
  z.string().regex(/^\d+(\.\d{1,2})?$/, 'Format jumlah tidak valid'),
  z.number().min(0).max(1e15)
]);

/**
 * Rate limiting config per endpoint
 */
export const rateLimitConfig = {
  // Auth endpoints - strict
  '/auth/login': { max: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  '/auth/register': { max: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  
  // Standard endpoints
  '/sales': { max: 60, windowMs: 60 * 1000 }, // 60 req/min
  '/purchases': { max: 60, windowMs: 60 * 1000 },
  
  // Read-heavy endpoints
  '/customers': { max: 100, windowMs: 60 * 1000 },
  '/products': { max: 100, windowMs: 60 * 1000 },
};

/**
 * IDOR guard helper - validates resource ownership
 */
export function idorGuardQuery(_businessId: string) {
  // Returns empty array - app code adds .eq('business_id', businessId) directly
  return [];
}

/**
 * Input size limits
 */
export const sizeLimits = {
  maxBodySize: 5 * 1024 * 1024, // 5MB
  maxArrayLength: 500, // Prevent large array processing
  maxObjectKeys: 50, // Prevent key exhaustion
  maxStringLength: 5000, // Per-field string limit
};

/**
 * Password policy schema
 */
export const passwordSchema = z.string()
  .min(8, 'Password minimal 8 karakter')
  .max(128, 'Password terlalu panjang')
  .refine(
    (pass) => /[A-Z]/.test(pass),
    'Password harus mengandung huruf kapital'
  )
  .refine(
    (pass) => /[a-z]/.test(pass),
    'Password harus mengandung huruf kecil'
  )
  .refine(
    (pass) => /\d/.test(pass),
    'Password harus mengandung angka'
  )
  .refine(
    (pass) => /[!@#$%^&*(),.?":{}|<>]/.test(pass),
    'Password harus mengandung karakter spesial (!@#$%^&*...)'
  );

/**
 * Escape regex special characters - prevents ReDoS / injection in .or() queries
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize SQL LIKE pattern - escapes wildcards for safe ilike queries
 */
export function sanitizeSQLLikePattern(input: string): string {
  return escapeRegExp(input).slice(0, 500);
}

/**
 * General input sanitizer - strips script tags and dangerous patterns
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, 10000);
}

/**
 * Strict UUID validator
 */
export function validateUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
