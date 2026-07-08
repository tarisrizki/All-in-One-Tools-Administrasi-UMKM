import { FastifyInstance } from 'fastify';
import { getClient, query } from '../../plugins/database.js';

export default async function purchaseRoutes(fastify: FastifyInstance) {
  // Get all purchase orders
  fastify.get('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;

    const result = await query(
      `SELECT po.*, s.name as supplier_name, w.name as warehouse_name 
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       JOIN warehouses w ON po.warehouse_id = w.id
       WHERE po.business_id = $1 
       ORDER BY po.created_at DESC`,
      [businessId]
    );

    return {
      success: true,
      data: result.rows,
    };
  });

  // Get PO details
  fastify.get('/:id', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;

    const poResult = await query(
      `SELECT po.*, s.name as supplier_name, w.name as warehouse_name 
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       JOIN warehouses w ON po.warehouse_id = w.id
       WHERE po.id = $1 AND po.business_id = $2`,
      [id, businessId]
    );

    if (poResult.rowCount === 0) {
      return reply.status(404).send({ success: false, error: { message: 'PO tidak ditemukan' } });
    }

    const itemsResult = await query(
      `SELECT poi.*, p.name as product_name, p.sku 
       FROM purchase_order_items poi
       JOIN products p ON poi.product_id = p.id
       WHERE poi.po_id = $1`,
      [id]
    );

    return {
      success: true,
      data: {
        ...poResult.rows[0],
        items: itemsResult.rows,
      },
    };
  });

  // Create a new PO
  fastify.post('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { warehouse_id, supplier_id, expected_date, notes, items } = request.body as any;

    if (!warehouse_id || !supplier_id || !items || items.length === 0) {
      return reply.status(400).send({ success: false, error: { message: 'Data PO tidak lengkap' } });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Generate PO Number
      const countResult = await client.query('SELECT COUNT(*) FROM purchase_orders WHERE business_id = $1', [businessId]);
      const nextId = parseInt(countResult.rows[0].count, 10) + 1;
      const poNumber = `PO/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${String(nextId).padStart(4, '0')}`;

      // Calculate total amount
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += (item.qty * item.cost_price);
      }

      // Insert PO
      const poRes = await client.query(
        `INSERT INTO purchase_orders (business_id, warehouse_id, supplier_id, po_number, status, total_amount, expected_date, notes, created_by)
         VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8) RETURNING *`,
        [businessId, warehouse_id, supplier_id, poNumber, totalAmount, expected_date || null, notes || null, user.id]
      );
      const newPo = poRes.rows[0];

      // Insert Items
      for (const item of items) {
        await client.query(
          `INSERT INTO purchase_order_items (po_id, product_id, qty, cost_price)
           VALUES ($1, $2, $3, $4)`,
          [newPo.id, item.product_id, item.qty, item.cost_price]
        );
      }

      await client.query('COMMIT');
      return reply.status(201).send({ success: true, data: newPo });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Update PO Status
  fastify.patch('/:id/status', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as any;
    const businessId = user.businessId;
    const { id } = request.params as any;
    const { status } = request.body as any;

    if (!['draft', 'ordered', 'received'].includes(status)) {
      return reply.status(400).send({ success: false, error: { message: 'Status tidak valid' } });
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Check current PO
      const poRes = await client.query(
        `SELECT * FROM purchase_orders WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [id, businessId]
      );

      if (poRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ success: false, error: { message: 'PO tidak ditemukan' } });
      }

      const po = poRes.rows[0];
      if (po.status === 'received') {
        await client.query('ROLLBACK');
        return reply.status(400).send({ success: false, error: { message: 'PO yang sudah diterima tidak dapat diubah statusnya' } });
      }

      // Update status
      const updateRes = await client.query(
        `UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
      );
      const updatedPo = updateRes.rows[0];

      // If status changes to 'received', update product stock!
      if (status === 'received') {
        const itemsRes = await client.query(`SELECT * FROM purchase_order_items WHERE po_id = $1`, [id]);
        
        for (const item of itemsRes.rows) {
          // Check if stock entry exists for this warehouse
          const stockRes = await client.query(
            `SELECT quantity FROM product_stock WHERE product_id = $1 AND warehouse_id = $2`,
            [item.product_id, po.warehouse_id]
          );

          if (stockRes.rowCount === 0) {
            // Insert
            await client.query(
              `INSERT INTO product_stock (product_id, warehouse_id, quantity) VALUES ($1, $2, $3)`,
              [item.product_id, po.warehouse_id, item.qty]
            );
          } else {
            // Update
            await client.query(
              `UPDATE product_stock SET quantity = quantity + $1, updated_at = NOW() WHERE product_id = $2 AND warehouse_id = $3`,
              [item.qty, item.product_id, po.warehouse_id]
            );
          }
        }
      }

      await client.query('COMMIT');
      return reply.send({ success: true, data: updatedPo });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
}
