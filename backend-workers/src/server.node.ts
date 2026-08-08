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

// Di Cloudflare Workers, export { scheduled } dijalankan oleh platform (cron trigger).
// Di Node, tidak ada platform — jadwalkan manual via setInterval (cron sederhana).
// Waktu: sama seperti wrangler.toml cron trigger (cek [triggers] untuk interval).
// Default: setiap 24 jam (backup harian + reset data demo).
const CRON_INTERVAL_MS = Number(process.env.CRON_INTERVAL_MS || 24 * 60 * 60 * 1000);

async function runScheduled() {
  try {
    console.log(`[cron:node] Menjalankan scheduled handler pada ${new Date().toISOString()}`);
    // worker.scheduled menerima (event, env, ctx) — env = process.env
    await worker.scheduled({}, process.env, {});
    console.log('[cron:node] Scheduled handler selesai');
  } catch (err) {
    console.error('[cron:node] Scheduled handler gagal:', err);
  }
}

// Jalankan sekali saat boot (untuk memastikan backup tidak menunggu 24 jam pertama),
// lalu ulangi per interval.
runScheduled();
setInterval(runScheduled, CRON_INTERVAL_MS);
