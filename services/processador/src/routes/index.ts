import type { FastifyInstance } from 'fastify';
import type { Processor } from '../processor/index.js';
import type { Db } from '../db/index.js';

let rodando = false;

export async function registerRoutes(app: FastifyInstance, processor: Processor, db: Db): Promise<void> {
  app.get('/health', async (_req, reply) => {
    const ok = db.saudavel();
    return reply.code(ok ? 200 : 503).send({ status: ok ? 'ok' : 'error', service: 'processador', rodando });
  });

  app.post('/run', async (_req, reply) => {
    if (rodando) {
      return reply.code(409).send({ ok: false, mensagem: 'Processamento ja em andamento.' });
    }
    rodando = true;
    processor.executarBatch()
      .catch(err => app.log.error(err, '[processador] Erro no batch via trigger manual'))
      .finally(() => { rodando = false; });
    return reply.code(202).send({ ok: true, mensagem: 'Processamento iniciado.' });
  });

  app.get('/status', async (_req, reply) => {
    return reply.code(200).send(db.getBatchEstado());
  });
}
