import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    sendWhatsAppMessage: (to: string, message: string) => Promise<boolean>;
  }
}

export default fp(async (app: FastifyInstance) => {
	const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
	const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
	const isMock = !WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID;

	app.decorate('sendWhatsAppMessage', async (to: string, message: string) => {
		// Clean phone number (remove leading 0 or +, ensure it starts with country code like 62)
		let cleanPhone = to.replace(/\D/g, '');
		if (cleanPhone.startsWith('0')) {
			cleanPhone = '62' + cleanPhone.substring(1);
		}

		if (isMock) {
			app.log.info(`[WHATSAPP MOCK] Message to ${cleanPhone}:\n${message}`);
			return true;
		}

		try {
			const url = `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
			const payload = {
				messaging_product: "whatsapp",
				to: cleanPhone,
				type: "text",
				text: {
					body: message
				}
			};

			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const errorData = await res.text();
				app.log.error({ errorData }, 'WhatsApp API Error');
				return false;
			}

			return true;
		} catch (error) {
			app.log.error(error as any, 'WhatsApp Fetch Error');
			return false;
		}
	});
});
