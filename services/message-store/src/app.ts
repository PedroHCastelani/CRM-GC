import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { Cipher } from './crypto/cipher.js';
import { Store } from './db/index.js';
import { criarLogger } from './lib/logger.js';
import { registrarRotas } from './routes/webhook.js';
import type { Config } from './config.js';

export interface App {
  app: FastifyInstance;
  store: Store;
}

export function criarApp(cfg: Config): App {
  const store = new Store(cfg.sqlitePath, new Cipher(cfg.encryptionKey));

  // O pino retorna Logger<never, boolean>, que expoe msgPrefix.
  // O Fastify tipa loggerInstance como FastifyBaseLogger, que nao o expoe.
  // Sao estruturalmente compativeis em runtime - o widening explicito evita
  // que o generic do FastifyInstance seja inferido como Logger concreto,
  // o que quebraria a atribuicao ao tipo App.
  const logger: FastifyBaseLogger = criarLogger(cfg.logLevel);

  const app: FastifyInstance = Fastify({
    loggerInstance: logger,
    bodyLimit: 1_048_576,
    trustProxy: true,
    disableRequestLogging: false,
  });

  registrarRotas(app, store);
  return { app, store };
}
