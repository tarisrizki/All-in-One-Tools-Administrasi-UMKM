import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getClient, query } from '../../plugins/database.js';

const productSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().uuid().nullable().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  costPrice: z.number().min(0),
  sellPrice: z.number().min(0),
  minStock: z.number().min(0).default(5),
  initialStock: z.number().min(0).default(0),
});

export default async function productRoutes(app: FastifyInstance) {
  // Protect all product routes
  app.addHook('preValidation', app.authenticate);

  app.get('/', async (request, reply) => {
    try {
      const { businessId } = request.user;
      
      const result = await query(
        `SELECT p.*, c.name as category_name, 
         COALESCE((SELECT SUM(quantity) FROM product_stock WHERE product_id = p.id), 0) as stock
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.business_id = $1
         ORDER BY p.created_at DESC`,
        [businessId]
      );

      return reply.send({ success: true, data: result.rows });
    } catch (err: unknown) {
      app.log.error(err);
      return reply.status(500).send({ success: false, error: { message: 'Gagal mengambil produk' } });
    }
  });

  app.post('/', async (request, reply) => {
    const client = await getClient();
    try {
      const { businessId } = request.user;
      const data = productSchema.parse(request.body);

      await client.query('BEGIN');

      // Get default warehouse if not specified
      const whRes = await client.query(
        'SELECT id FROM warehouses WHERE business_id = $1 AND is_default = true LIMIT 1',
        [businessId]
      );
      
      if (whRes.rows.length === 0) {
        throw new Error('Gudang utama tidak ditemukan');
      }
      const warehouseId = whRes.rows[0].id;

      // Insert product
      const prodRes = await client.query(
        `INSERT INTO products 
        (business_id, category_id, sku, barcode, name, cost_price, sell_price, min_stock) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [businessId, data.categoryId || null, data.sku, data.barcode, data.name, data.costPrice, data.sellPrice, data.minStock]
      );
      
      const newProduct = prodRes.rows[0];

      // Insert initial stock
      await client.query(
        `INSERT INTO product_stock (product_id, warehouse_id, quantity)
         VALUES ($1, $2, $3)`,
        [newProduct.id, warehouseId, data.initialStock]
      );

      await client.query('COMMIT');

      return reply.status(201).send({ success: true, data: { ...newProduct, stock: data.initialStock } });
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan produk';
      return reply.status(400).send({ success: false, error: { message: msg } });
    } finally {
      client.release();
    }
  });
}
