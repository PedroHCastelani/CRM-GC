import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

const ENV_VALIDO = {
  ENCRYPTION_KEY: 'a'.repeat(64),
  GEMINI_API_KEY: 'key-gemini',
  NOTION_TOKEN: 'secret-notion',
  NOTION_DATABASE_LEADS_ID: 'db-leads-id',
  PORT: '3002',
  SQLITE_PATH: ':memory:',
  BATCH_CRON: '0 2 * * *',
  IA_RETRY_MAX: '4',
  IA_RETRY_DELAY_MS: '30000',
};

function setEnv(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
}
function clearEnv() {
  for (const k of Object.keys(ENV_VALIDO)) delete process.env[k];
}

describe('loadConfig', () => {
  beforeEach(() => setEnv(ENV_VALIDO));
  afterEach(() => clearEnv());

  it('deve carregar config válida com sucesso', () => {
    const cfg = loadConfig();
    expect(cfg.port).toBe(3002);
    expect(cfg.iaRetryMax).toBe(4);
    expect(cfg.geminiModel).toBe('gemini-2.5-flash-lite');
  });

  it('deve lançar erro se ENCRYPTION_KEY ausente', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => loadConfig()).toThrow('ENCRYPTION_KEY');
  });

  it('deve lançar erro se GEMINI_API_KEY ausente', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => loadConfig()).toThrow('GEMINI_API_KEY');
  });

  it('deve lançar erro se NOTION_TOKEN ausente', () => {
    delete process.env.NOTION_TOKEN;
    expect(() => loadConfig()).toThrow('NOTION_TOKEN');
  });

  it('deve lançar erro se ENCRYPTION_KEY tem formato inválido', () => {
    process.env.ENCRYPTION_KEY = 'chave-curta-demais';
    expect(() => loadConfig()).toThrow('64 caracteres');
  });
});
