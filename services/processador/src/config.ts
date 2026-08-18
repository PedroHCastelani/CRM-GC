export interface Config {
  port: number;
  sqlitePath: string;
  encryptionKey: Buffer;
  logLevel: string;
  batchCron: string;
  iaRetryMax: number;
  iaRetryDelayMs: number;
  geminiApiKey: string;
  geminiModel: string;
  notionToken: string;
  notionDbLeadsId: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  return v.trim();
}

export function loadConfig(): Config {
  const raw = requireEnv('ENCRYPTION_KEY');
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error('ENCRYPTION_KEY deve ter 64 caracteres hexadecimais (32 bytes). Gere com: openssl rand -hex 32');
  }
  return {
    port: Number(process.env.PORT ?? 3002),
    sqlitePath: process.env.SQLITE_PATH ?? '/data/crm.db',
    encryptionKey: Buffer.from(raw, 'hex'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    batchCron: process.env.BATCH_CRON ?? '0 2 * * *',
    iaRetryMax: Number(process.env.RETRY_MAX_ATTEMPTS ?? process.env.IA_RETRY_MAX ?? 4),
    iaRetryDelayMs: Number(process.env.RETRY_DELAY_MS ?? process.env.IA_RETRY_DELAY_MS ?? 30000),
    geminiApiKey: requireEnv('GEMINI_API_KEY'),
    geminiModel: process.env.AI_MODEL ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite',
    notionToken: requireEnv('NOTION_TOKEN'),
    notionDbLeadsId: process.env.NOTION_DB_LEADS ?? requireEnv('NOTION_DATABASE_LEADS_ID'),
  };
}
