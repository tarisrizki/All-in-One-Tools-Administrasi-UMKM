import { FastifyInstance } from 'fastify';
import { query } from '../../plugins/database.js';

export default async function rolesRoutes(fastify: FastifyInstance) {
  // Get assignable roles
  fastify.get('/', {
    preValidation: [fastify.authenticate],
  }, async (request, reply) => {
    // We do not allow standard users to create new "owner". Only "admin" and "cashier" are typically assignable.
    const result = await query(
      `SELECT id, name, description 
       FROM roles 
       WHERE name != 'owner' 
       ORDER BY name ASC`
    );

    return {
      success: true,
      data: result.rows,
    };
  });
}
