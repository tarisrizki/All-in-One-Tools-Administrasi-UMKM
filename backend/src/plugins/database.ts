import pg from "pg";
import config from "../config/index.js";

const { Pool } = pg;

export const pool = new Pool({
	host: config.db.host,
	port: config.db.port,
	database: config.db.database,
	user: config.db.user,
	password: config.db.password,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
});

// Graceful shutdown helper
pool.on("error", (err) => {
	console.error("Unexpected error on idle database client", err);
});

/**
 * Execute a query against the database.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
	text: string,
	params?: unknown[],
): Promise<pg.QueryResult<T>> {
	const start = Date.now();
	const result = await pool.query<T>(text, params);
	const duration = Date.now() - start;

	if (config.nodeEnv === "development") {
		console.log("Executed query", {
			text: text.substring(0, 80),
			duration,
			rows: result.rowCount,
		});
	}

	return result;
}

/**
 * Get a client from the pool for transactions.
 */
export async function getClient() {
	const client = await pool.connect();
	return client;
}
