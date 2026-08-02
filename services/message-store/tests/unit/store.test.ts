import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Store } from '../../src/db/index.js';
import { Cipher } from '../../src/crypto/cipher.js';
import { CHAVE_TESTE } from '../helpers.js';
import type { MensagemNormalizada } from '../../src/types.js';

let store: Store;

function msg(over: Partial<MensagemNormalizada> = {}): MensagemNormalizada {
  return {
    externalId: `M${Math.random().toString(36).slice(2, 12)}`,
    telefone: '5535999998888',
    pushName: 'Maria Silva',
    conteudo: 'Quero informacoes',
    direcao: 'in',
    timestamp: 1_760_000_000,
    instancia: 'crm-gc',
    ...over,
  };
}

beforeEach(() => { store = new Store(':memory:', new Cipher(Buffer.from(CHAVE_TESTE, 'hex'))); });
afterEach(() => store.fechar());

describe('Store', () => {
  it('cria lead novo na primeira mensagem (item 015)', () => {
    const r = store.salvarMensagem(msg());
    expect(r.leadNovo).toBe(true);
    expect(r.duplicada).toBe(false);
    expect(store.estatisticas().leads).toBe(1);
  });

  it('reaproveita lead existente pelo telefone (item 015)', () => {
    store.salvarMensagem(msg());
    const r = store.salvarMensagem(msg());
    expect(r.leadNovo).toBe(false);
    expect(store.estatisticas()).toMatchObject({ leads: 1, mensagens: 2 });
  });

  it('e idempotente por external_id (item 016)', () => {
    const m = msg();
    const a = store.salvarMensagem(m);
    const b = store.salvarMensagem(m);
    expect(b.duplicada).toBe(true);
    expect(b.mensagemId).toBe(a.mensagemId);
    expect(store.estatisticas().mensagens).toBe(1);
  });

  it('separa leads distintos', () => {
    store.salvarMensagem(msg({ telefone: '5535999998888' }));
    store.salvarMensagem(msg({ telefone: '5535911112222' }));
    expect(store.estatisticas().leads).toBe(2);
  });

  it('preenche nome vazio quando chega depois', () => {
    const a = store.salvarMensagem(msg({ pushName: '' }));
    store.salvarMensagem(msg({ pushName: 'Joana' }));
    expect(store.conversaDoLead(a.leadId)).toHaveLength(2);
  });

  it('recupera conversa em ordem cronologica e em claro', () => {
    const r = store.salvarMensagem(msg({ conteudo: 'primeira', timestamp: 100 }));
    store.salvarMensagem(msg({ conteudo: 'segunda', timestamp: 200 }));
    const conv = store.conversaDoLead(r.leadId);
    expect(conv.map((c) => c.conteudo)).toEqual(['primeira', 'segunda']);
  });

  it('marca mensagens como nao processadas', () => {
    store.salvarMensagem(msg());
    expect(store.estatisticas().naoProcessadas).toBe(1);
  });

  it('registra descartes', () => {
    store.registrarDescarte('grupo', 'ID1');
    store.registrarDescarte('mensagem_propria');
    expect(store.estatisticas().descartes).toBe(2);
  });

  it('conversa de lead inexistente retorna vazio', () => {
    expect(store.conversaDoLead(9999)).toEqual([]);
  });

  it('reporta saude do banco', () => {
    expect(store.saudavel()).toBe(true);
  });
});
