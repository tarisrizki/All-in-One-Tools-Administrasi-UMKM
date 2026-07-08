import { Meilisearch } from 'meilisearch';

export const meili = new Meilisearch({
  host: process.env.MEILISEARCH_URL || 'http://localhost:7700',
  apiKey: process.env.MEILI_MASTER_KEY || 'umkm_master_key_123',
});
