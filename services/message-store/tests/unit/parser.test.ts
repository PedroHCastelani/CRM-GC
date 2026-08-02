import { describe, it, expect } from 'vitest';
import { parseWebhook, extrairTelefone } from '../../src/parser/webhook.js';
import { payload } from '../helpers.js';

describe('parseWebhook (contrato DT-001)', () => {
  it('aceita mensagem de texto valida', () => {
    const r = parseWebhook(payload());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mensagem.telefone).toBe('5535999998888');
      expect(r.mensagem.pushName).toBe('Maria Silva');
      expect(r.mensagem.direcao).toBe('in');
      expect(r.mensagem.instancia).toBe('crm-gc');
    }
  });

  it('aceita extendedTextMessage', () => {
    const r = parseWebhook(payload({
      message: { extendedTextMessage: { text: 'resposta a mensagem citada' } },
      messageType: 'extendedTextMessage',
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mensagem.conteudo).toBe('resposta a mensagem citada');
  });

  it('descarta mensagem propria (fromMe)', () => {
    const r = parseWebhook(payload({ key: { remoteJid: '5535999998888@s.whatsapp.net', fromMe: true, id: 'X1' } }));
    expect(r).toMatchObject({ ok: false, motivo: 'mensagem_propria' });
  });

  it('descarta grupo (DT-007)', () => {
    const r = parseWebhook(payload({ key: { remoteJid: '123456789-987@g.us', fromMe: false, id: 'X2' } }));
    expect(r).toMatchObject({ ok: false, motivo: 'grupo' });
  });

  it('descarta evento diferente de messages.upsert', () => {
    const r = parseWebhook({ ...payload(), event: 'connection.update' });
    expect(r).toMatchObject({ ok: false, motivo: 'evento_ignorado' });
  });

  it('descarta audio e imagem', () => {
    for (const t of ['audioMessage', 'imageMessage', 'stickerMessage']) {
      const r = parseWebhook(payload({ message: { [t]: { url: 'x' } }, messageType: t }));
      expect(r).toMatchObject({ ok: false, motivo: 'tipo_nao_suportado' });
    }
  });

  it('descarta texto vazio ou so espacos', () => {
    expect(parseWebhook(payload({ message: { conversation: '   ' } })))
      .toMatchObject({ ok: false, motivo: 'sem_conteudo' });
  });

  it('aceita pushName ausente (lead vindo de anuncio)', () => {
    const p = payload();
    delete (p['data'] as Record<string, unknown>)['pushName'];
    const r = parseWebhook(p);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mensagem.pushName).toBe('');
  });

  it('aceita sufixo @lid', () => {
    const r = parseWebhook(payload({ key: { remoteJid: '5535911112222@lid', fromMe: false, id: 'X3' } }));
    expect(r.ok).toBe(true);
  });

  it('usa timestamp atual quando ausente ou invalido', () => {
    const r = parseWebhook(payload({ messageTimestamp: 0 }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.mensagem.timestamp).toBeGreaterThan(1_700_000_000);
  });

  it('nao lanca excecao com payloads absurdos', () => {
    for (const p of [null, undefined, 42, 'texto', [], {}, { event: 'messages.upsert' },
                     { event: 'messages.upsert', data: null }]) {
      expect(() => parseWebhook(p)).not.toThrow();
      expect(parseWebhook(p).ok).toBe(false);
    }
  });

  it('descarta key.id ausente', () => {
    const r = parseWebhook(payload({ key: { remoteJid: '5535999998888@s.whatsapp.net', fromMe: false } }));
    expect(r).toMatchObject({ ok: false, motivo: 'payload_invalido' });
  });
});

describe('extrairTelefone', () => {
  it.each([
    ['5535999998888@s.whatsapp.net', '5535999998888'],
    ['5535911112222@lid', '5535911112222'],
    ['5535999998888:12@s.whatsapp.net', '5535999998888'],
  ])('extrai de %s', (jid, esperado) => expect(extrairTelefone(jid)).toBe(esperado));

  it.each([null, undefined, 42, '', '@s.whatsapp.net', '123@s.whatsapp.net', '123-456@g.us'])(
    'rejeita %s', (jid) => expect(extrairTelefone(jid)).toBeNull()
  );
});
