import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '../db/schema.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://umkm_user:umkm_pass@localhost:5433/umkm_db',
});

export const db = drizzle(pool, { schema });
