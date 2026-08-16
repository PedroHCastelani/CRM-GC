import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/index.js';

export async function statusRoute(app: FastifyInstance, db: Db): Promise<void> {
  app.get('/status', async (_req, reply) => {
    const estado = db.getBatchEstado();
    if (!estado) {
      return reply.code(503).send({ erro: 'Estado do batch indisponivel' });
    }
    return reply.code(200).send(estado);
  });
}
