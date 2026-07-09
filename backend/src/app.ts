import Fastify, { FastifyError } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import config from "./config/index.js";

// Import route modules
import authPlugin from "./plugins/auth.js";
import midtransPlugin from "./plugins/midtrans.js";
import whatsappPlugin from "./plugins/whatsapp.js";
import emailPlugin from "./plugins/email.js";
import authRoutes from "./modules/auth/routes.js";
import productRoutes from "./modules/products/routes.js";
import categoryRoutes from "./modules/categories/routes.js";
import salesRoutes from "./modules/sales/routes.js";
import cashbookRoutes from "./modules/cashbook/routes.js";
import reportRoutes from "./modules/reports/routes.js";
import healthRoutes from "./modules/health/routes.js";
import warehouseRoutes from "./modules/warehouses/routes.js";
import supplierRoutes from "./modules/suppliers/routes.js";
import purchaseRoutes from "./modules/purchases/routes.js";
import debtsRoutes from "./modules/debts/routes.js";
import customerRoutes from "./modules/customers/routes.js";
import employeeRoutes from "./modules/employees/routes.js";
import roleRoutes from "./modules/roles/routes.js";
import syncRoutes from "./modules/sync/routes.js";
import marketplaceRoutes from "./modules/sync/marketplace.js";
import settingsRoutes from "./modules/settings/routes.js";
import backupRoutes from "./modules/backup/routes.js";
import aiRoutes from "./modules/ai/routes.js";
import { setupScheduledBackup } from "./plugins/bullmq.js";

const app = Fastify({
	logger: {
		level: config.nodeEnv === "development" ? "info" : "warn",
		transport:
			config.nodeEnv === "development"
				? { target: "pino-pretty", options: { colorize: true } }
				: undefined,
	},
});

import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Plugins ---
await app.register(cors, {
	origin: config.cors.origin,
	credentials: true,
});
// Dipasang sekarang -- sebelumnya @fastify/rate-limit terinstal tapi tidak
// pernah didaftarkan, jadi API tidak punya proteksi sama sekali dari brute
// force / spam request. Default cukup longgar untuk pemakaian normal (POS
// scan barcode berulang, polling dashboard, dll); endpoint login dibatasi
// lebih ketat lagi di modules/auth/routes.ts.
await app.register(rateLimit, {
	max: 300,
	timeWindow: "1 minute",
	allowList: (req) => req.url.startsWith("/v1/health"),
});
await app.register(authPlugin);
await app.register(midtransPlugin);
await app.register(whatsappPlugin);
await app.register(emailPlugin);
await app.register(fastifyMultipart, {
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadsDir = path.join(__dirname, '..', 'uploads');
import fs from 'fs';
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

await app.register(fastifyStatic, {
	root: uploadsDir,
	prefix: '/uploads/',
});

// --- Routes ---
await app.register(healthRoutes, { prefix: "/v1" });
await app.register(authRoutes, { prefix: "/v1/auth" });
await app.register(productRoutes, { prefix: "/v1/products" });
await app.register(categoryRoutes, { prefix: "/v1/categories" });
await app.register(salesRoutes, { prefix: "/v1/sales" });
await app.register(cashbookRoutes, { prefix: "/v1/cashbook" });
await app.register(reportRoutes, { prefix: "/v1/reports" });
await app.register(warehouseRoutes, { prefix: "/v1/warehouses" });
await app.register(supplierRoutes, { prefix: "/v1/suppliers" });
await app.register(purchaseRoutes, { prefix: "/v1/purchase-orders" });
await app.register(debtsRoutes, { prefix: "/v1/debts" });
await app.register(customerRoutes, { prefix: "/v1/customers" });
await app.register(employeeRoutes, { prefix: "/v1/employees" });
await app.register(roleRoutes, { prefix: "/v1/roles" });
await app.register(syncRoutes, { prefix: "/v1/sync" });
await app.register(marketplaceRoutes, { prefix: "/v1/sync/marketplace" });
await app.register(settingsRoutes, { prefix: "/v1/settings" });
await app.register(backupRoutes, { prefix: "/v1/backup" });
await app.register(aiRoutes, { prefix: "/v1/ai" });

// --- Global error handler ---
app.setErrorHandler((error: FastifyError, request, reply) => {
	const statusCode = error.statusCode || 500;

	app.log.error(error);

	reply.status(statusCode).send({
		success: false,
		error: {
			code: error.code || "INTERNAL_ERROR",
			message:
				config.nodeEnv === "production"
					? "Terjadi kesalahan pada server"
					: error.message,
		},
	});
});

// --- Start server ---
async function start() {
	try {
		await app.listen({ port: config.port, host: config.host });
		app.log.info(`Server berjalan di http://${config.host}:${config.port}`);
		await setupScheduledBackup();
	} catch (err) {
		app.log.error(err);
		process.exit(1);
	}
}

start();

export default app;
