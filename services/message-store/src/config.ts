export interface Config {
  port: number;
  sqlitePath: string;
  encryptionKey: Buffer;
  logLevel: string;
  retentionDays: number;
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
    port: Number(process.env.PORT ?? 3001),
    sqlitePath: process.env.SQLITE_PATH ?? '/data/crm.db',
    encryptionKey: Buffer.from(raw, 'hex'),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    retentionDays: Number(process.env.RETENTION_DAYS ?? 180),
  };
}
