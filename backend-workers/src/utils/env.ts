// Env abstraction agar backend jalan di Cloudflare Workers (c.env) DAN Node self-host (process.env).
// Hono di Node menyediakan c.env = process.env secara otomatis (via @hono/node-server), tapi
// beberapa binding (KV, dll) hanya ada di Workers. Helper ini memastikan fallback yang konsisten.

type Env = Record<string, any>;

type EnvSource = { env?: Env } | Env | undefined;

export function getEnv(source: EnvSource, key: string): string | undefined {
  const env = source && 'env' in source ? source.env : source;
  return env?.[key] ?? process.env[key];
}

export function getEnvOrThrow(source: EnvSource, key: string): string {
  const v = getEnv(source, key);
  if (!v) throw new Error(`Missing ${key} in environment variables`);
  return v;
}

