import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../../plugins/database.js';

const cashbookSchema = z.object({
  type: z.enum(['in', 'out']),
  amount: z.number().min(1),
  description: z.string().min(2),
});

export default async function cashbookRoutes(app: FastifyInstance) {
  app.addHook('preValidation', app.authenticate);

  app.get('/', async (request, reply) => {
    try {
      const { businessId } = request.user;
      
      const result = await query(
        `SELECT * FROM cashbook_entries 
         WHERE business_id = $1 
         ORDER BY created_at DESC LIMIT 100`,
        [businessId]
      );

      return reply.send({ success: true, data: result.rows });
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({ success: false, error: { message: 'Gagal mengambil buku kas' } });
    }
  });

  app.post('/', async (request, reply) => {
    try {
      const { businessId, userId } = request.user;
      const data = cashbookSchema.parse(request.body);

      const result = await query(
        `INSERT INTO cashbook_entries 
        (business_id, type, amount, description, created_by) 
        VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [businessId, data.type, data.amount, data.description, userId]
      );

      return reply.status(201).send({ success: true, data: result.rows[0] });
    } catch (err: unknown) {
      app.log.error(err);
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan transaksi kas';
      return reply.status(400).send({ success: false, error: { message: msg } });
    }
  });
}
