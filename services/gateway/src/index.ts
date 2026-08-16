import Fastify from 'fastify';
import { loadConfig } from './config/index.js';
import { Db } from './db/index.js';
import { registerIpFilter } from './middleware/ipFilter.js';
import { healthRoute } from './routes/health.js';
import { statusRoute } from './routes/status.js';
import { triggerRoute } from './routes/trigger.js';
import { painelRoute } from './routes/painel.js';

async function bootstrap() {
  const cfg = loadConfig();
  const db = new Db(cfg.sqlitePath);
  const app = Fastify({ logger: { level: cfg.logLevel }, trustProxy: true });

  registerIpFilter(app, cfg.allowedIps);
  await healthRoute(app, db);
  await statusRoute(app, db);
  await triggerRoute(app, cfg.processadorUrl);
  await painelRoute(app);

  await app.listen({ port: cfg.port, host: '0.0.0.0' });
  console.log('[gateway] Rodando na porta ' + cfg.port);
}

bootstrap().catch(err => {
  console.error('[FATAL] Erro ao iniciar o Gateway:', err);
  process.exit(1);
});
