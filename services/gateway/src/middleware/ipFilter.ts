import type { FastifyInstance } from 'fastify';

export function registerIpFilter(app: FastifyInstance, allowedIps: string[]): void {
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return; // health check sempre permitido
    const ip = request.ip;
    if (!allowedIps.includes(ip)) {
      app.log.warn({ ip }, '[gateway] Acesso bloqueado — IP nao autorizado');
      return reply.code(403).send({ erro: 'Acesso nao autorizado.' });
    }
  });
}
