import type { FastifyInstance } from 'fastify';

export async function triggerRoute(app: FastifyInstance, processadorUrl: string): Promise<void> {
  app.post('/trigger', async (_req, reply) => {
    try {
      const res = await fetch(`${processadorUrl}/run`, { method: 'POST' });
      if (res.status === 409) {
        return reply.code(409).send({ ok: false, mensagem: 'Processamento ja em andamento.' });
      }
      if (!res.ok) {
        return reply.code(503).send({ ok: false, mensagem: 'Servico de processamento indisponivel. Tente novamente em instantes.' });
      }
      return reply.code(202).send({ ok: true, mensagem: 'Processamento iniciado.' });
    } catch {
      return reply.code(503).send({ ok: false, mensagem: 'Servico de processamento indisponivel. Tente novamente em instantes.' });
    }
  });
}
