import { FastifyInstance } from 'fastify';
import { getClient, query } from '../../plugins/database.js';

export default async function debtsRoutes(fastify: FastifyInstance) {
  // Get all debts for the business
  fastify.get('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { type, status } = request.query as any;

    let sql = `SELECT * FROM debts WHERE business_id = $1`;
    const params: any[] = [businessId];
    let count = 2;

    if (type) {
      sql += ` AND type = $${count++}`;
      params.push(type);
    }
    if (status) {
      sql += ` AND status = $${count++}`;
      params.push(status);
    }

    sql += ` ORDER BY due_date ASC NULLS LAST, created_at DESC`;

    const result = await query(sql, params);

    return {
      success: true,
      data: result.rows,
    };
  });

  // Get debt details with payments
  fastify.get('/:id', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;

    const debtRes = await query(
      `SELECT * FROM debts WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );

    if (debtRes.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Data tidak ditemukan' } });
    }

    const paymentsRes = await query(
      `SELECT * FROM debt_payments WHERE debt_id = $1 ORDER BY payment_date DESC`,
      [id]
    );

    return {
      success: true,
      data: {
        ...debtRes.rows[0],
        payments: paymentsRes.rows,
      },
    };
  });

  // Create new debt
  fastify.post('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { type, entity_name, entity_phone, amount, due_date, notes } = request.body as any;

    if (!type || !entity_name || !amount) {
      return reply.status(400).send({ success: false, error: { message: 'Data tidak lengkap' } });
    }

    const result = await query(
      `INSERT INTO debts (business_id, type, entity_name, entity_phone, amount, remaining_amount, due_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [businessId, type, entity_name, entity_phone || null, amount, amount, due_date || null, notes || null, user.id]
    );

    return reply.status(201).send({
      success: true,
      data: result.rows[0],
    });
  });

  // Record a payment
  fastify.post('/:id/payments', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;
    const { amount, payment_method, notes } = request.body as any;

    if (!amount || amount <= 0) {
      return reply.status(400).send({ success: false, error: { message: 'Nominal pembayaran tidak valid' } });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Check debt
      const debtRes = await client.query(
        `SELECT * FROM debts WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [id, businessId]
      );

      if (debtRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ success: false, error: { message: 'Data tidak ditemukan' } });
      }

      const debt = debtRes.rows[0];
      if (debt.status === 'paid' || debt.remaining_amount <= 0) {
        await client.query('ROLLBACK');
        return reply.status(400).send({ success: false, error: { message: 'Tagihan sudah lunas' } });
      }

      let paymentAmount = amount;
      if (paymentAmount > debt.remaining_amount) {
        paymentAmount = debt.remaining_amount; // don't overpay
      }

      const newRemaining = debt.remaining_amount - paymentAmount;
      let newStatus = debt.status;

      if (newRemaining <= 0) {
        newStatus = 'paid';
      } else if (newRemaining < debt.amount) {
        newStatus = 'partial';
      }

      // Insert payment
      await client.query(
        `INSERT INTO debt_payments (debt_id, amount, payment_method, notes, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, paymentAmount, payment_method || 'cash', notes || null, user.id]
      );

      // Update debt
      const updatedDebtRes = await client.query(
        `UPDATE debts SET remaining_amount = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
        [newRemaining, newStatus, id]
      );

      await client.query('COMMIT');
      return reply.send({ success: true, data: updatedDebtRes.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Remind via WhatsApp (Mock)
  fastify.post('/:id/remind', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;

    const debtRes = await query(
      `SELECT * FROM debts WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );

    if (debtRes.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'Data tidak ditemukan' } });
    }

    const debt = debtRes.rows[0];
    if (!debt.entity_phone) {
      return reply.status(400).send({ success: false, error: { message: 'Nomor telepon tidak tersedia' } });
    }

    // MOCK WHATSAPP API
    const message = `Halo ${debt.entity_name}, sekadar mengingatkan bahwa ada tagihan/piutang sebesar Rp ${debt.remaining_amount} yang jatuh tempo pada ${debt.due_date ? new Date(debt.due_date).toLocaleDateString('id-ID') : 'waktu dekat'}.`;
    
    fastify.log.info(`[MOCK WA API] Mengirim pesan ke ${debt.entity_phone}: ${message}`);

    return {
      success: true,
      message: 'Pengingat berhasil dikirim (Mock)'
    };
  });
}
