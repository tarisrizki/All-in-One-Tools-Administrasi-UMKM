import { FastifyInstance } from 'fastify';
import { query } from '../../plugins/database.js';

export default async function warehouseRoutes(fastify: FastifyInstance) {
  // Get all warehouses for the business
  fastify.get('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;

    const result = await query(
      `SELECT * FROM warehouses WHERE business_id = $1 ORDER BY created_at ASC`,
      [businessId]
    );

    return {
      success: true,
      data: result.rows,
    };
  });

  // Create a new warehouse
  fastify.post('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { name, address, is_default } = request.body as any;

    if (!name) {
      return reply.status(400).send({ success: false, error: { message: 'Nama gudang wajib diisi' } });
    }

    // If is_default is true, maybe we should unset others, but for now just insert
    const result = await query(
      `INSERT INTO warehouses (business_id, name, address, is_default)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [businessId, name, address, is_default || false]
    );

    return reply.status(201).send({
      success: true,
      data: result.rows[0],
    });
  });

  // Edit warehouse
  fastify.put('/:id', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;
    const { name, address, is_default, is_active } = request.body as any;

    const result = await query(
      `UPDATE warehouses 
       SET name = COALESCE($1, name), 
           address = COALESCE($2, address),
           is_default = COALESCE($3, is_default),
           is_active = COALESCE($4, is_active)
       WHERE id = $5 AND business_id = $6 RETURNING *`,
      [name, address, is_default, is_active, id, businessId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Gudang tidak ditemukan' } });
    }

    return {
      success: true,
      data: result.rows[0],
    };
  });
}
