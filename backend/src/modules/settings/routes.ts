import type { FastifyInstance } from "fastify";
import { db } from "../../plugins/drizzle.js";
import { businesses } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');

export default async function settingsRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	app.post("/upload", { preHandler: [app.requirePermission('settings.manage')] }, async (request, reply) => {
		try {
			const { businessId } = request.user;
			const data = await request.file();
			
			if (!data) {
				return reply.status(400).send({ success: false, error: { message: "File tidak ditemukan" } });
			}

			const ext = path.extname(data.filename).toLowerCase();
			if (!['.png', '.jpg', '.jpeg', '.svg'].includes(ext)) {
				return reply.status(400).send({ success: false, error: { message: "Format tidak didukung" } });
			}

			const typeField = data.fields.type;
			const type = typeField && 'value' in typeField ? typeField.value : 'stamp';
			
			if (!['stamp', 'signature', 'logo'].includes(type as string)) {
				return reply.status(400).send({ success: false, error: { message: "Tipe tidak valid" } });
			}

			const filename = `${businessId}-${type}-${randomUUID()}${ext}`;
			const dest = path.join(uploadsDir, filename);

			await pipeline(data.file, fs.createWriteStream(dest));

			const url = `/uploads/${filename}`;

			// Update business settings
			const biz = await db.query.businesses.findFirst({
				where: eq(businesses.id, businessId)
			});

			if (!biz) throw new Error("Bisnis tidak ditemukan");
			
			const currentSettings = (biz.settings as Record<string, any>) || {};
			const newSettings = { ...currentSettings, [`${type}Url`]: url };

			await db.update(businesses)
				.set({ settings: newSettings })
				.where(eq(businesses.id, businessId));

			return reply.send({ success: true, data: { url } });

		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Gagal mengunggah berkas";
			return reply.status(400).send({ success: false, error: { message: msg } });
		}
	});
}
