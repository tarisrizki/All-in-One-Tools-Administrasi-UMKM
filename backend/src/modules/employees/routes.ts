import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { query } from '../../plugins/database.js';

export default async function employeeRoutes(fastify: FastifyInstance) {
  // Get all employees
  fastify.get('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;

    const result = await query(
      `SELECT u.id, u.name, u.phone, u.email, u.is_active, r.name as role_name, r.id as role_id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.business_id = $1
       ORDER BY u.created_at ASC`,
      [businessId]
    );

    return {
      success: true,
      data: result.rows,
    };
  });

  // Create new employee
  fastify.post('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { name, phone, password, role_id } = request.body as any;

    if (!name || !phone || !password || !role_id) {
      return reply.status(400).send({ success: false, error: { message: 'Semua kolom wajib diisi (Nama, Nomor HP, Password, Peran)' } });
    }

    try {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const result = await query(
        `INSERT INTO users (business_id, role_id, name, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, name, phone`,
        [businessId, role_id, name, phone, passwordHash]
      );

      return reply.status(201).send({
        success: true,
        data: result.rows[0],
      });
    } catch (e: any) {
      if (e.code === '23505') { // unique violation
        return reply.status(400).send({ success: false, error: { message: 'Nomor HP sudah terdaftar' } });
      }
      throw e;
    }
  });

  // Toggle active status (Deactivate / Activate)
  fastify.put('/:id/status', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;
    const { is_active } = request.body as any;

    // Prevent deactivating oneself
    if (id === user.userId) {
      return reply.status(400).send({ success: false, error: { message: 'Tidak dapat menonaktifkan akun sendiri' } });
    }

    const result = await query(
      `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3 RETURNING id, is_active`,
      [is_active, id, businessId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Karyawan tidak ditemukan' } });
    }

    return { success: true, data: result.rows[0] };
  });
}
