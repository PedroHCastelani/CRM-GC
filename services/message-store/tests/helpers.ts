import type { Config } from '../src/config.js';

export const CHAVE_TESTE = 'a'.repeat(64);

export function configTeste(): Config {
  return {
    port: 0,
    sqlitePath: ':memory:',
    encryptionKey: Buffer.from(CHAVE_TESTE, 'hex'),
    logLevel: 'silent',
    retentionDays: 180,
  };
}

export function payload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    event: 'messages.upsert',
    instance: 'crm-gc',
    data: {
      key: { remoteJid: '5535999998888@s.whatsapp.net', fromMe: false, id: `MSG${Math.random().toString(36).slice(2, 12)}` },
      pushName: 'Maria Silva',
      message: { conversation: 'Quero saber sobre as aulas' },
      messageType: 'conversation',
      messageTimestamp: 1_760_000_000,
      ...over,
    },
  };
}
