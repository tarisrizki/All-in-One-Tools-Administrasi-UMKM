import { FastifyInstance } from 'fastify';
import { query } from '../../plugins/database.js';

export default async function supplierRoutes(fastify: FastifyInstance) {
  // Get all suppliers
  fastify.get('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;

    const result = await query(
      `SELECT * FROM suppliers WHERE business_id = $1 ORDER BY name ASC`,
      [businessId]
    );

    return {
      success: true,
      data: result.rows,
    };
  });

  // Create a new supplier
  fastify.post('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { name, contact_name, phone, address, email } = request.body as any;

    if (!name) {
      return reply.status(400).send({ success: false, error: { message: 'Nama supplier wajib diisi' } });
    }

    const result = await query(
      `INSERT INTO suppliers (business_id, name, contact_name, phone, address, email)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [businessId, name, contact_name, phone, address, email]
    );

    return reply.status(201).send({
      success: true,
      data: result.rows[0],
    });
  });

  // Update supplier
  fastify.put('/:id', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;
    const { name, contact_name, phone, address, email, is_active } = request.body as any;

    const result = await query(
      `UPDATE suppliers 
       SET name = COALESCE($1, name), 
           contact_name = COALESCE($2, contact_name),
           phone = COALESCE($3, phone),
           address = COALESCE($4, address),
           email = COALESCE($5, email),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7 AND business_id = $8 RETURNING *`,
      [name, contact_name, phone, address, email, is_active, id, businessId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Supplier tidak ditemukan' } });
    }

    return {
      success: true,
      data: result.rows[0],
    };
  });
}
