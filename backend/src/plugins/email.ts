import nodemailer from 'nodemailer';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    sendEmail: (to: string, subject: string, html: string, attachments?: any[]) => Promise<boolean>;
  }
}

export default fp(async (app: FastifyInstance) => {
	const SMTP_HOST = process.env.SMTP_HOST;
	const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
	const SMTP_USER = process.env.SMTP_USER;
	const SMTP_PASS = process.env.SMTP_PASS;

	const isMock = !SMTP_HOST || !SMTP_USER || !SMTP_PASS;

	let transporter: nodemailer.Transporter | null = null;
	
	if (!isMock) {
		transporter = nodemailer.createTransport({
			host: SMTP_HOST,
			port: SMTP_PORT,
			secure: SMTP_PORT === 465,
			auth: {
				user: SMTP_USER,
				pass: SMTP_PASS,
			},
		});
	}

	app.decorate('sendEmail', async (to: string, subject: string, html: string, attachments: any[] = []) => {
		if (isMock || !transporter) {
			app.log.info(`[EMAIL MOCK] Email to ${to}\nSubject: ${subject}\nAttachments: ${attachments.length}`);
			return true;
		}

		try {
			await transporter.sendMail({
				from: `"Sistem UMKM" <${SMTP_USER}>`,
				to,
				subject,
				html,
				attachments
			});
			return true;
		} catch (error) {
			app.log.error(error as any, 'Email Error');
			return false;
		}
	});
});
