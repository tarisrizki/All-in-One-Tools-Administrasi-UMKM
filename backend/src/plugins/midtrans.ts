// @ts-ignore
import midtransClient from 'midtrans-client';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  interface FastifyInstance {
    createQrisPayment: (transactionId: string, amount: number, items?: any[]) => Promise<{ token?: string; redirect_url?: string; mock?: boolean }>;
  }
}

export default fp(async (app: FastifyInstance) => {
	const isMock = !process.env.MIDTRANS_SERVER_KEY;
	
	let snap: any;
	if (!isMock) {
		snap = new midtransClient.Snap({
			isProduction: false,
			serverKey: process.env.MIDTRANS_SERVER_KEY || '',
			clientKey: process.env.MIDTRANS_CLIENT_KEY || ''
		});
	}

	app.decorate('createQrisPayment', async (transactionId: string, amount: number, items: any[] = []) => {
		if (isMock) {
			app.log.info(`[MIDTRANS MOCK] Creating QRIS payment for ${transactionId} (Rp${amount})`);
			return {
				mock: true,
				token: 'mock-snap-token-' + transactionId,
				redirect_url: 'https://simulator.sandbox.midtrans.com/qris/mock'
			};
		}

		try {
			const parameter = {
				transaction_details: {
					order_id: transactionId,
					gross_amount: amount
				},
				enabled_payments: ["gopay", "shopeepay", "other_qris"],
			};

			const transaction = await snap.createTransaction(parameter);
			return {
				mock: false,
				token: transaction.token,
				redirect_url: transaction.redirect_url
			};
		} catch (error) {
			app.log.error(error as any, 'Midtrans Error');
			throw new Error("Gagal membuat pembayaran Midtrans");
		}
	});
});
