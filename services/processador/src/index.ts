import Fastify from 'fastify';
import cron from 'node-cron';
import { loadConfig } from './config.js';
import { Cipher } from './crypto/cipher.js';
import { Db } from './db/index.js';
import { GeminiClient } from './gemini/index.js';
import { NotionClient } from './notion/index.js';
import { Processor } from './processor/index.js';
import { registerRoutes } from './routes/index.js';

async function bootstrap() {
  const cfg = loadConfig();
  const cipher = new Cipher(cfg.encryptionKey);
  const db = new Db(cfg.sqlitePath, cipher);
  const gemini = new GeminiClient(cfg.geminiApiKey, cfg.geminiModel, cfg.iaRetryMax, cfg.iaRetryDelayMs);
  const notion = new NotionClient(cfg.notionToken, cfg.notionDbLeadsId);
  const processor = new Processor(db, gemini, notion);

  if (!cron.validate(cfg.batchCron)) {
    console.error(`[FATAL] BATCH_CRON invalido: "${cfg.batchCron}"`);
    process.exit(1);
  }

  cron.schedule(cfg.batchCron, async () => {
    console.log(`[processador] Batch diario iniciado (${cfg.batchCron})`);
    try { await processor.executarBatch(); }
    catch (err) { console.error('[processador] Erro no batch diario:', err); }
  });
  console.log(`[processador] Batch agendado: ${cfg.batchCron}`);

  const app = Fastify({ logger: { level: cfg.logLevel } });
  await registerRoutes(app, processor, db);

  await app.listen({ port: cfg.port, host: '0.0.0.0' });
  console.log(`[processador] Rodando na porta ${cfg.port}`);
}

bootstrap().catch(err => {
  console.error('[FATAL] Erro ao iniciar o Processador:', err);
  process.exit(1);
});
