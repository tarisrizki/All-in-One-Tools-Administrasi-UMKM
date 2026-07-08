import type { FastifyInstance } from "fastify";
import fs from "fs";
import path from "path";
import { backupQueue } from "../../plugins/bullmq.js";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export default async function backupRoutes(app: FastifyInstance) {
	app.addHook("preValidation", app.authenticate);

	const backupDir = path.join(process.cwd(), "backups");

	// Trigger manual backup
	app.post("/trigger", { preHandler: [app.requirePermission('settings.manage')] }, async (request, reply) => {
		try {
			const job = await backupQueue.add('manual-backup', {});
			return reply.send({ success: true, message: "Pencadangan data telah dimulai", jobId: job.id });
		} catch (error: any) {
			app.log.error(error);
			return reply.status(500).send({ success: false, error: { message: "Gagal memulai pencadangan" } });
		}
	});

	// List backups
	app.get("/list", { preHandler: [app.requirePermission('settings.manage')] }, async (request, reply) => {
		try {
			if (!fs.existsSync(backupDir)) {
				return reply.send({ success: true, data: [] });
			}
			const files = fs.readdirSync(backupDir).filter(f => f.endsWith(".sql"));
			const data = files.map(file => {
				const stats = fs.statSync(path.join(backupDir, file));
				return {
					name: file,
					size: stats.size,
					createdAt: stats.birthtime,
				};
			}).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

			return reply.send({ success: true, data });
		} catch (error: any) {
			app.log.error(error);
			return reply.status(500).send({ success: false, error: { message: "Gagal mengambil daftar cadangan" } });
		}
	});

	// Restore backup
	app.post("/restore", { preHandler: [app.requirePermission('settings.manage')] }, async (request, reply) => {
		try {
			const { fileName } = request.body as { fileName: string };
			if (!fileName) {
				return reply.status(400).send({ success: false, error: { message: "Nama file cadangan diperlukan" } });
			}

			const filePath = path.join(backupDir, fileName);
			if (!fs.existsSync(filePath)) {
				return reply.status(404).send({ success: false, error: { message: "File cadangan tidak ditemukan" } });
			}

			const dbUser = process.env.DB_USER || "umkm_user";
			const dbName = process.env.DB_NAME || "umkm_db";

			// We need to pass the file into the docker container or use `cat file | docker exec -i ...`
			// Warning: Restoring drops data or merges. Using pg_restore for custom format, or psql for SQL format.
			// Since we used `pg_dump > file.sql`, it's a plain SQL script. We can restore with `psql`.
			const cmd = `cmd.exe /c type "${filePath}" | docker exec -i umkm-postgres psql -U ${dbUser} -d ${dbName}`;

			app.log.info(`Restoring backup: ${fileName}`);
			await execPromise(cmd);
			
			return reply.send({ success: true, message: "Pemulihan data berhasil" });
		} catch (error: any) {
			app.log.error(error);
			return reply.status(500).send({ success: false, error: { message: "Gagal memulihkan data" } });
		}
	});
}
