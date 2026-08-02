import type { FastifyInstance } from 'fastify';
import { parseWebhook } from '../parser/webhook.js';
import { mascararTelefone } from '../lib/logger.js';
import type { Store } from '../db/index.js';

export function registrarRotas(app: FastifyInstance, store: Store): void {
  // POST /webhook - item 013
  app.post('/webhook', async (req, reply) => {
    const r = parseWebhook(req.body);

    if (!r.ok) {
      store.registrarDescarte(r.motivo, r.detalhe);
      app.log.info({ motivo: r.motivo, detalhe: r.detalhe }, 'webhook descartado');
      // 200 sempre: a Evolution API reenvia indefinidamente em caso de erro
      return reply.code(200).send({ status: 'ignorado', motivo: r.motivo });
    }

    try {
      const res = store.salvarMensagem(r.mensagem);
      app.log.info({
        leadId: res.leadId,
        telefone: mascararTelefone(r.mensagem.telefone),
        duplicada: res.duplicada,
        leadNovo: res.leadNovo,
      }, res.duplicada ? 'mensagem duplicada' : 'mensagem persistida');

      return reply.code(res.duplicada ? 200 : 201).send({
        status: res.duplicada ? 'duplicada' : 'persistida',
        leadId: res.leadId,
        mensagemId: res.mensagemId,
        leadNovo: res.leadNovo,
      });
    } catch (e) {
      app.log.error({ err: (e as Error).message }, 'falha ao persistir');
      return reply.code(500).send({ status: 'erro' });
    }
  });

  // GET /health - item 019
  app.get('/health', async (_req, reply) => {
    const ok = store.saudavel();
    return reply.code(ok ? 200 : 503).send({
      status: ok ? 'ok' : 'degradado',
      db: ok ? 'ok' : 'falha',
      uptime: Math.floor(process.uptime()),
    });
  });

  // GET /stats - observabilidade
  app.get('/stats', async (_req, reply) => reply.send(store.estatisticas()));

  // GET /leads/:id/conversa - consumido pelo Processador (Sprint 5)
  app.get<{ Params: { id: string } }>('/leads/:id/conversa', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return reply.code(400).send({ erro: 'id invalido' });
    }
    return reply.send({ leadId: id, mensagens: store.conversaDoLead(id) });
  });
}
