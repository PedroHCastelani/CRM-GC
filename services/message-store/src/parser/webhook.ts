import type { ResultadoParser } from '../types.js';

const TIPOS_TEXTO = new Set(['conversation', 'extendedTextMessage']);

/** Extrai o numero de remoteJid, aceitando @s.whatsapp.net e @lid (DT-001). */
export function extrairTelefone(jid: unknown): string | null {
  if (typeof jid !== 'string' || jid === '') return null;
  if (jid.endsWith('@g.us')) return null; // grupo - DT-007
  const numero = jid.split('@')[0]?.split(':')[0]?.replace(/\D/g, '') ?? '';
  return numero.length >= 10 && numero.length <= 15 ? numero : null;
}

function extrairTexto(message: Record<string, unknown> | undefined): string | null {
  if (!message) return null;
  if (typeof message['conversation'] === 'string') return message['conversation'];
  const ext = message['extendedTextMessage'];
  if (ext && typeof ext === 'object' && typeof (ext as Record<string, unknown>)['text'] === 'string') {
    return (ext as Record<string, string>)['text'] ?? null;
  }
  return null;
}

/**
 * Parser defensivo do payload da Evolution API v2 (contrato DT-001).
 * Nunca lanca excecao - sempre retorna ResultadoParser.
 */
export function parseWebhook(body: unknown): ResultadoParser {
  if (!body || typeof body !== 'object') return { ok: false, motivo: 'payload_invalido' };
  const p = body as Record<string, unknown>;

  const evento = String(p['event'] ?? '').toLowerCase();
  if (evento !== 'messages.upsert') {
    return { ok: false, motivo: 'evento_ignorado', detalhe: evento || 'ausente' };
  }

  const data = p['data'];
  if (!data || typeof data !== 'object') return { ok: false, motivo: 'payload_invalido' };
  const d = data as Record<string, unknown>;

  const key = (d['key'] ?? {}) as Record<string, unknown>;
  const externalId = typeof key['id'] === 'string' ? key['id'] : '';
  if (externalId === '') return { ok: false, motivo: 'payload_invalido', detalhe: 'key.id ausente' };

  if (key['fromMe'] === true) return { ok: false, motivo: 'mensagem_propria', detalhe: externalId };

  const jid = key['remoteJid'];
  if (typeof jid === 'string' && jid.endsWith('@g.us')) {
    return { ok: false, motivo: 'grupo', detalhe: externalId };
  }

  const telefone = extrairTelefone(jid);
  if (!telefone) return { ok: false, motivo: 'jid_invalido', detalhe: String(jid) };

  const tipo = String(d['messageType'] ?? '');
  const texto = extrairTexto(d['message'] as Record<string, unknown> | undefined);

  if (texto === null) {
    return TIPOS_TEXTO.has(tipo)
      ? { ok: false, motivo: 'sem_conteudo', detalhe: externalId }
      : { ok: false, motivo: 'tipo_nao_suportado', detalhe: tipo || 'desconhecido' };
  }
  if (texto.trim() === '') return { ok: false, motivo: 'sem_conteudo', detalhe: externalId };

  const tsRaw = Number(d['messageTimestamp'] ?? 0);
  const timestamp = Number.isFinite(tsRaw) && tsRaw > 0 ? Math.floor(tsRaw) : Math.floor(Date.now() / 1000);

  return {
    ok: true,
    mensagem: {
      externalId,
      telefone,
      pushName: typeof d['pushName'] === 'string' ? d['pushName'] : '',
      conteudo: texto,
      direcao: 'in',
      timestamp,
      instancia: typeof p['instance'] === 'string' ? p['instance'] : 'desconhecida',
    },
  };
}
F11_PLACEHOLDER=1
