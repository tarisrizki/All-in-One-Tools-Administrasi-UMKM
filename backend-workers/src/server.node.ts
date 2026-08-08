// Entry point untuk self-host (Node.js) — dipakai saat deploy di VPS/Proxmox.
// Di Cloudflare Workers, wrangler memakai export default dari src/index.ts.
// Di sini worker.fetch (app.fetch) diserve via @hono/node-server.
// c.env di Hono/Node = process.env, jadi semua env dibaca dari environment.
import { serve } from '@hono/node-server';
import worker from './index';

const port = Number(process.env.PORT || 8787);

serve({ fetch: worker.fetch, port }, (info) => {
  console.log(`Beres UMKM API listening on http://localhost:${info.port}`);
});
