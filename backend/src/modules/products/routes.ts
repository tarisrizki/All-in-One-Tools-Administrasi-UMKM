import { FastifyInstance } from 'fastify';

/**
 * Product routes — GET/POST /v1/products, GET/PUT/DELETE /v1/products/:id
 * Placeholder for Sprint S2 implementation.
 */
export default async function productRoutes(app: FastifyInstance) {
  // GET /v1/products — List products
  app.get('/', async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Daftar produk akan diimplementasi di Sprint S2',
      },
    });
  });

  // POST /v1/products — Create product
  app.post('/', async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Tambah produk akan diimplementasi di Sprint S2',
      },
    });
  });

  // GET /v1/products/:id — Get product detail
  app.get('/:id', async (_request, reply) => {
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Detail produk akan diimplementasi di Sprint S2',
      },
    });
  });
}
