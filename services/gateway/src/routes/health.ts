import type { FastifyInstance } from 'fastify';
import type { Db } from '../db/index.js';

export async function healthRoute(app: FastifyInstance, db: Db): Promise<void> {
  app.get('/health', async (_req, reply) => {
    const ok = db.saudavel();
    return reply.code(ok ? 200 : 503).send({
      status: ok ? 'ok' : 'error',
      service: 'gateway',
    });
  });
}
