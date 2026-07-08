import "dotenv/config";

const config = {
	// Server
	port: parseInt(process.env.PORT || "3001", 10),
	host: process.env.HOST || "0.0.0.0",
	nodeEnv: process.env.NODE_ENV || "development",

	// Database (PostgreSQL)
	db: {
		host: process.env.DB_HOST || "localhost",
		port: parseInt(process.env.DB_PORT || "5432", 10),
		database: process.env.DB_NAME || "umkm_db",
		user: process.env.DB_USER || "umkm_user",
		password: process.env.DB_PASSWORD || "umkm_pass",
	},

	// Redis
	redis: {
		host: process.env.REDIS_HOST || "localhost",
		port: parseInt(process.env.REDIS_PORT || "6379", 10),
	},

	// JWT
	jwt: {
		secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
		accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
		refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
	},

	// CORS
	cors: {
		origin: true,
	},
} as const;

export default config;
export type Config = typeof config;
