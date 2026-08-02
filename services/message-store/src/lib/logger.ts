import pino, { type Logger } from 'pino';

/** Mascara telefone mantendo apenas os 4 ultimos digitos (LGPD). */
export function mascararTelefone(t: string): string {
  return t.length <= 4 ? '****' : `${'*'.repeat(t.length - 4)}${t.slice(-4)}`;
}

export function criarLogger(level: string): Logger {
  return pino({
    level,
    base: { svc: 'message-store' },
    redact: {
      paths: [
        'req.body.data.message',
        'req.body.data.pushName',
        'conteudo',
        'telefone',
        'pushName',
      ],
      censor: '[REDIGIDO]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}
