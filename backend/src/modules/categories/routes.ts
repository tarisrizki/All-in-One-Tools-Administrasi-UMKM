import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../../plugins/database.js';

const categorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export default async function categoryRoutes(app: FastifyInstance) {
  app.addHook('preValidation', app.authenticate);

  app.get('/', async (request, reply) => {
    try {
      const { businessId } = request.user;
      
      const result = await query(
        `SELECT * FROM categories WHERE business_id = $1 ORDER BY sort_order ASC, created_at DESC`,
        [businessId]
      );

      return reply.send({ success: true, data: result.rows });
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({ success: false, error: { message: 'Gagal mengambil kategori' } });
    }
  });

  app.post('/', async (request, reply) => {
    try {
      const { businessId } = request.user;
      const { name, description } = categorySchema.parse(request.body);

      const result = await query(
        `INSERT INTO categories (business_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
        [businessId, name, description || null]
      );

      return reply.status(201).send({ success: true, data: result.rows[0] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan kategori';
      return reply.status(400).send({ success: false, error: { message: msg } });
    }
  });
}
