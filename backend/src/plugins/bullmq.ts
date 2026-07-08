import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

// Redis connection
export const connection = new IORedis({
	host: process.env.REDIS_HOST || 'localhost',
	port: Number(process.env.REDIS_PORT) || 6379,
	maxRetriesPerRequest: null,
});

// Create Backup Queue
export const backupQueue = new Queue('backupQueue', { connection: connection as any });

// Backup Worker
export const backupWorker = new Worker('backupQueue', async (job) => {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupDir = path.join(process.cwd(), 'backups');
	
	if (!fs.existsSync(backupDir)) {
		fs.mkdirSync(backupDir, { recursive: true });
	}

	const fileName = `backup-${timestamp}.sql`;
	const filePath = path.join(backupDir, fileName);

	const dbUser = process.env.DB_USER || 'umkm_user';
	const dbName = process.env.DB_NAME || 'umkm_db';

	// The docker container name is 'umkm-postgres'
	// We run pg_dump inside the container and pipe the output to our local file
	const cmd = `docker exec -i umkm-postgres pg_dump -U ${dbUser} -d ${dbName} > ${filePath}`;
	
	try {
		console.log(`[Backup Worker] Starting backup: ${fileName}`);
		await execPromise(cmd);
		console.log(`[Backup Worker] Backup completed: ${fileName}`);
		return { fileName, filePath, status: 'success' };
	} catch (error: any) {
		console.error(`[Backup Worker] Backup failed`, error);
		// If it fails, maybe the file is empty, so we remove it
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
		throw error;
	}
}, { connection: connection as any });

backupWorker.on('completed', (job) => {
	console.log(`Job ${job.id} completed!`);
});

backupWorker.on('failed', (job, err) => {
	console.error(`Job ${job?.id} failed:`, err);
});

// Setup repeatable backup job (Daily at midnight)
export async function setupScheduledBackup() {
	await backupQueue.add('daily-backup', {}, {
		repeat: {
			pattern: '0 0 * * *' // Every day at 00:00
		}
	});
	console.log('[BullMQ] Scheduled daily backup job.');
}
