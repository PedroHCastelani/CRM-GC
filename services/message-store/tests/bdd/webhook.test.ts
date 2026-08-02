import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { criarApp, type App } from '../../src/app.js';
import { configTeste, payload } from '../helpers.js';

let ctx: App;
beforeEach(() => { ctx = criarApp(configTeste()); });
afterEach(async () => { await ctx.app.close(); ctx.store.fechar(); });

const post = (body: unknown) => ctx.app.inject({ method: 'POST', url: '/webhook', payload: body as object });

describe('Feature: Recebimento de mensagens do WhatsApp (secao 5.1)', () => {
  it('Cenario 1: mensagem de lead novo e persistida e o lead criado', async () => {
    const r = await post(payload());
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ status: 'persistida', leadNovo: true });
    expect(ctx.store.estatisticas()).toMatchObject({ leads: 1, mensagens: 1 });
  });

  it('Cenario 2: segunda mensagem do mesmo lead nao duplica o lead', async () => {
    await post(payload());
    const r = await post(payload());
    expect(r.statusCode).toBe(201);
    expect(r.json().leadNovo).toBe(false);
    expect(ctx.store.estatisticas()).toMatchObject({ leads: 1, mensagens: 2 });
  });

  it('Cenario 3: webhook reenviado nao duplica a mensagem (idempotencia)', async () => {
    const p = payload();
    await post(p);
    const r = await post(p);
    expect(r.statusCode).toBe(200);
    expect(r.json().status).toBe('duplicada');
    expect(ctx.store.estatisticas().mensagens).toBe(1);
  });

  it('Cenario 4: mensagem enviada pela clinica e ignorada', async () => {
    const r = await post(payload({ key: { remoteJid: '5535999998888@s.whatsapp.net', fromMe: true, id: 'OUT1' } }));
    expect(r.statusCode).toBe(200);
    expect(r.json().motivo).toBe('mensagem_propria');
    expect(ctx.store.estatisticas().mensagens).toBe(0);
  });

  it('Cenario 5: mensagem de grupo e descartada', async () => {
    const r = await post(payload({ key: { remoteJid: '123-456@g.us', fromMe: false, id: 'G1' } }));
    expect(r.json().motivo).toBe('grupo');
    expect(ctx.store.estatisticas().mensagens).toBe(0);
  });

  it('Cenario 6: audio e descartado e o descarte auditado', async () => {
    const r = await post(payload({ message: { audioMessage: { url: 'x' } }, messageType: 'audioMessage' }));
    expect(r.json().motivo).toBe('tipo_nao_suportado');
    expect(ctx.store.estatisticas().descartes).toBe(1);
  });

  it('Cenario 7: payload malformado responde 200 sem quebrar o servico', async () => {
    for (const p of [{}, { event: 'x' }, { event: 'messages.upsert', data: 'texto' }]) {
      const r = await post(p);
      expect(r.statusCode).toBe(200);
      expect(r.json().status).toBe('ignorado');
    }
    const h = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(h.statusCode).toBe(200);
  });

  it('Cenario 8: conteudo persistido esta criptografado em repouso (RN-005)', async () => {
    const p = payload({ message: { conversation: 'Meu filho tem TDAH' } });
    const r = await post(p);
    const conv = ctx.store.conversaDoLead(r.json().leadId);
    expect(conv[0]?.conteudo).toBe('Meu filho tem TDAH');
  });

  it('Cenario 9: GET /health reporta o servico saudavel', async () => {
    const r = await ctx.app.inject({ method: 'GET', url: '/health' });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ status: 'ok', db: 'ok' });
  });

  it('Cenario 10: GET /leads/:id/conversa valida o parametro', async () => {
    const r = await ctx.app.inject({ method: 'GET', url: '/leads/abc/conversa' });
    expect(r.statusCode).toBe(400);
  });

  it('Cenario 11: GET /stats expoe contadores de observabilidade', async () => {
    await post(payload());
    const r = await ctx.app.inject({ method: 'GET', url: '/stats' });
    expect(r.json()).toMatchObject({ leads: 1, mensagens: 1, naoProcessadas: 1 });
  });
});
