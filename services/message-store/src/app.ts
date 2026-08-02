import Fastify, { type FastifyInstance } from 'fastify';
import { Cipher } from './crypto/cipher.js';
import { Store } from './db/index.js';
import { criarLogger } from './lib/logger.js';
import { registrarRotas } from './routes/webhook.js';
import type { Config } from './config.js';

export interface App { app: FastifyInstance; store: Store }

export function criarApp(cfg: Config): App {
  const store = new Store(cfg.sqlitePath, new Cipher(cfg.encryptionKey));
  const app = Fastify({
    loggerInstance: criarLogger(cfg.logLevel),
    bodyLimit: 1_048_576,
    trustProxy: true,
  });
  registrarRotas(app, store);
  return { app, store };
}
