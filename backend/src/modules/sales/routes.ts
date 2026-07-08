import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getClient } from '../../plugins/database.js';
import { randomUUID } from 'crypto';

const saleItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().min(1),
  price: z.number().min(0),
  discount: z.number().min(0).default(0),
});

const paymentSchema = z.object({
  method: z.string(),
  amount: z.number().min(0),
});

const saleSchema = z.object({
  clientTransactionId: z.string().uuid().optional(),
  items: z.array(saleItemSchema).min(1),
  payments: z.array(paymentSchema).min(1),
});

export default async function salesRoutes(app: FastifyInstance) {
  app.addHook('preValidation', app.authenticate);

  app.post('/', async (request, reply) => {
    const client = await getClient();
    try {
      const { businessId, userId } = request.user;
      const data = saleSchema.parse(request.body);
      
      const clientTxId = data.clientTransactionId || randomUUID();

      await client.query('BEGIN');

      // Idempotency check
      const existingSale = await client.query(
        'SELECT id FROM sales WHERE business_id = $1 AND client_transaction_id = $2',
        [businessId, clientTxId]
      );
      
      if (existingSale.rows.length > 0) {
        await client.query('ROLLBACK');
        return reply.status(200).send({ success: true, message: 'Transaksi sudah ada', data: { id: existingSale.rows[0].id } });
      }

      // Get warehouse
      const whRes = await client.query(
        'SELECT id FROM warehouses WHERE business_id = $1 AND is_default = true LIMIT 1',
        [businessId]
      );
      if (whRes.rows.length === 0) throw new Error('Gudang tidak ditemukan');
      const warehouseId = whRes.rows[0].id;

      // Calculate totals
      let subtotal = 0;
      let discountTotal = 0;
      for (const item of data.items) {
         subtotal += item.price * item.qty;
         discountTotal += item.discount * item.qty;
      }
      const grandTotal = subtotal - discountTotal;

      // Generate invoice number
      const invoiceNumber = `INV/${new Date().getFullYear()}/${new Date().getMonth()+1}/${Math.floor(Math.random() * 10000)}`;

      // 1. Insert Sale
      const saleRes = await client.query(
        `INSERT INTO sales 
        (business_id, warehouse_id, client_transaction_id, invoice_number, subtotal, discount_total, grand_total, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [businessId, warehouseId, clientTxId, invoiceNumber, subtotal, discountTotal, grandTotal, userId]
      );
      const sale = saleRes.rows[0];

      // 2. Insert Items & Update Stock
      for (const item of data.items) {
        await client.query(
          `INSERT INTO sale_items (sale_id, product_id, qty, price, discount)
           VALUES ($1, $2, $3, $4, $5)`,
          [sale.id, item.productId, item.qty, item.price, item.discount]
        );

        // Update stock
        await client.query(
          `UPDATE product_stock 
           SET quantity = quantity - $1, updated_at = NOW()
           WHERE product_id = $2 AND warehouse_id = $3`,
          [item.qty, item.productId, warehouseId]
        );

        // Optional: strict stock validation
        // if (stockRes.rows[0].quantity < 0) {
        //   throw new Error('Stok produk tidak mencukupi untuk ' + item.productId);
        // }
      }

      // 3. Insert Payments
      let totalPaid = 0;
      for (const pay of data.payments) {
         totalPaid += pay.amount;
         await client.query(
           `INSERT INTO payments (sale_id, method, amount) VALUES ($1, $2, $3)`,
           [sale.id, pay.method, pay.amount]
         );
      }

      // 4. Update status if fully paid (simple check)
      const status = totalPaid >= grandTotal ? 'paid' : 'partial';
      if (status !== 'paid') {
         await client.query(`UPDATE sales SET status = $1 WHERE id = $2`, [status, sale.id]);
      }

      await client.query('COMMIT');

      return reply.status(201).send({ success: true, data: sale });
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      const msg = err instanceof Error ? err.message : 'Gagal memproses transaksi';
      return reply.status(400).send({ success: false, error: { message: msg } });
    } finally {
      client.release();
    }
  });
}
