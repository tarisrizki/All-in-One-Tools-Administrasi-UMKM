// Env abstraction agar backend jalan di Cloudflare Workers (c.env) DAN Node self-host (process.env).
// Hono di Node menyediakan c.env = process.env secara otomatis (via @hono/node-server), tapi
// beberapa binding (KV, dll) hanya ada di Workers. Helper ini memastikan fallback yang konsisten.

type Env = Record<string, any>;

export function getEnv(c: { env?: Env }, key: string): string | undefined {
  const v = c.env?.[key] ?? process.env[key];
  return v;
}

export function getEnvOrThrow(c: { env?: Env }, key: string): string {
  const v = getEnv(c, key);
  if (!v) throw new Error(`Missing ${key} in environment variables`);
  return v;
}
