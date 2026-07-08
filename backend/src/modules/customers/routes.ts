import { FastifyInstance } from 'fastify';
import { query } from '../../plugins/database.js';

export default async function customerRoutes(fastify: FastifyInstance) {
  // Get all customers
  fastify.get('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { search } = request.query as any;

    let sql = `SELECT * FROM customers WHERE business_id = $1`;
    const params: any[] = [businessId];

    if (search) {
      sql += ` AND (name ILIKE $2 OR phone ILIKE $2 OR email ILIKE $2)`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY name ASC`;

    const result = await query(sql, params);

    return {
      success: true,
      data: result.rows,
    };
  });

  // Get specific customer
  fastify.get('/:id', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;

    const result = await query(
      `SELECT * FROM customers WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Pelanggan tidak ditemukan' } });
    }

    return {
      success: true,
      data: result.rows[0],
    };
  });

  // Create new customer
  fastify.post('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { name, phone, email, address } = request.body as any;

    if (!name) {
      return reply.status(400).send({ success: false, error: { message: 'Nama pelanggan wajib diisi' } });
    }

    const result = await query(
      `INSERT INTO customers (business_id, name, phone, email, address, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [businessId, name, phone || null, email || null, address || null, user.id]
    );

    return reply.status(201).send({
      success: true,
      data: result.rows[0],
    });
  });

  // Update customer
  fastify.put('/:id', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;
    const { name, phone, email, address } = request.body as any;

    if (!name) {
      return reply.status(400).send({ success: false, error: { message: 'Nama pelanggan wajib diisi' } });
    }

    const result = await query(
      `UPDATE customers 
       SET name = $1, phone = $2, email = $3, address = $4, updated_at = NOW() 
       WHERE id = $5 AND business_id = $6 RETURNING *`,
      [name, phone || null, email || null, address || null, id, businessId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Pelanggan tidak ditemukan' } });
    }

    return {
      success: true,
      data: result.rows[0],
    };
  });
}
