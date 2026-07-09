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
	// PENTING: sebelumnya app.jwt.sign(...) dipanggil tanpa expiresIn sama
	// sekali, jadi token yang terbit valid SELAMANYA -- kalau bocor (XSS,
	// device dicuri, log ke-expose, dll), penyerang dapat akses permanen.
	// /refresh belum diimplementasi (masih 501), jadi dipakai satu masa
	// berlaku yang wajar (bukan 15 menit ala access-token+refresh, karena
	// refresh-nya memang belum ada) daripada tidak expire sama sekali.
	jwt: {
		secret: process.env.JWT_SECRET || "dev-secret-change-in-production",
		accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || "7d",
		refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || "30d",
	},

	// CORS
	// PENTING: sebelumnya origin:true (refleksikan Origin apa pun) walau
	// DEPLOYMENT_GUIDE.md mendokumentasikan CORS_ORIGIN sebagai variabel yang
	// seharusnya dibaca. origin:true + credentials:true adalah kombinasi
	// yang secara luas dianggap tidak aman -- situs mana pun berpotensi
	// memanggil API ini. Sekarang benar-benar membaca CORS_ORIGIN (bisa
	// beberapa origin dipisah koma); development tetap longgar biar tidak
	// menghambat kerja lokal.
	cors: {
		origin:
			process.env.NODE_ENV === "production"
				? (process.env.CORS_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean)
				: true,
	},
} as const;

export default config;
export type Config = typeof config;
