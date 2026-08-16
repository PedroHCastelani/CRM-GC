export interface Config {
  port: number;
  sqlitePath: string;
  processadorUrl: string;
  allowedIps: string[];
  logLevel: string;
}

export function loadConfig(): Config {
  const allowedRaw = process.env.ALLOWED_IPS ?? '127.0.0.1';
  return {
    port: Number(process.env.PORT ?? 3003),
    sqlitePath: process.env.SQLITE_PATH ?? '/data/crm.db',
    processadorUrl: process.env.PROCESSADOR_URL ?? 'http://processador:3002',
    allowedIps: allowedRaw.split(',').map(ip => ip.trim()).filter(Boolean),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  };
}
