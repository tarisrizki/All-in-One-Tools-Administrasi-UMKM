import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { getClient, query } from '../../plugins/database.js';

const registerSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(6),
  businessName: z.string().min(2),
});

const loginSchema = z.object({
  phone: z.string().min(10),
  password: z.string().min(6),
});

export default async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const { phone, password, businessName } = registerSchema.parse(request.body);
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Check if user already exists
      const existingUser = await client.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (existingUser.rows.length > 0) {
        throw new Error('Nomor HP sudah terdaftar');
      }

      // 2. Get owner role id
      const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['owner']);
      if (roleRes.rows.length === 0) {
         throw new Error('Role owner tidak ditemukan di database');
      }
      const ownerRoleId = roleRes.rows[0].id;

      // 3. Create Business
      const businessRes = await client.query(
        'INSERT INTO businesses (name) VALUES ($1) RETURNING id',
        [businessName]
      );
      const businessId = businessRes.rows[0].id;

      // 4. Create User (Owner)
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const userRes = await client.query(
        'INSERT INTO users (business_id, role_id, name, phone, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [businessId, ownerRoleId, 'Owner', phone, passwordHash]
      );
      const userId = userRes.rows[0].id;

      // 5. Create Default Warehouse
      await client.query(
        'INSERT INTO warehouses (business_id, name, is_default) VALUES ($1, $2, $3)',
        [businessId, 'Gudang Utama', true]
      );

      // 6. Create Default Category
      await client.query(
        'INSERT INTO categories (business_id, name, description) VALUES ($1, $2, $3)',
        [businessId, 'Umum', 'Kategori default']
      );

      await client.query('COMMIT');

      // Generate JWT
      const token = app.jwt.sign({ userId, businessId, roleId: ownerRoleId });

      return reply.status(201).send({
        success: true,
        data: { token, userId, businessId }
      });
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      const message = err instanceof Error ? err.message : 'Gagal mendaftar';
      return reply.status(400).send({
         success: false,
         error: {
           code: 'REGISTER_FAILED',
           message: message,
         }
      });
    } finally {
      client.release();
    }
  });

  app.post('/login', async (request, reply) => {
    try {
      const { phone, password } = loginSchema.parse(request.body);
      const userRes = await query(
        'SELECT id, business_id, role_id, password_hash FROM users WHERE phone = $1',
        [phone]
      );

      if (userRes.rows.length === 0) {
        return reply.status(401).send({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'Nomor HP atau kata sandi salah' } 
        });
      }

      const user = userRes.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);

      if (!match) {
        return reply.status(401).send({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'Nomor HP atau kata sandi salah' } 
        });
      }

      const token = app.jwt.sign({
        userId: user.id,
        businessId: user.business_id,
        roleId: user.role_id,
      });

      return reply.send({
        success: true,
        data: { token, userId: user.id, businessId: user.business_id }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal masuk';
      return reply.status(400).send({
         success: false,
         error: { code: 'LOGIN_FAILED', message: message }
      });
    }
  });
  
  app.get('/me', { preValidation: [app.authenticate] }, async (request, reply) => {
    try {
      const { userId } = request.user;
      const userRes = await query(
        `SELECT u.id, u.name, u.phone, b.name as business_name, r.name as role_name 
         FROM users u
         JOIN businesses b ON u.business_id = b.id
         JOIN roles r ON u.role_id = r.id
         WHERE u.id = $1`,
        [userId]
      );
      
      if (userRes.rows.length === 0) {
        return reply.status(404).send({ 
          success: false, 
          error: { code: 'NOT_FOUND', message: 'Pengguna tidak ditemukan' } 
        });
      }
      
      return reply.send({ success: true, data: userRes.rows[0] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      return reply.status(400).send({
         success: false,
         error: { code: 'FETCH_ME_FAILED', message: message }
      });
    }
  });

  // Placeholder for logout and refresh (can be handled client-side for JWT by clearing token for MVP)
  app.post('/refresh', async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Refresh token belum diimplementasi' }
    });
  });

  app.post('/logout', async (_request, reply) => {
    return reply.status(200).send({
      success: true,
      message: 'Logout berhasil, hapus token di client',
    });
  });
}
