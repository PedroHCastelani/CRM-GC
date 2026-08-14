import { describe, it, expect, beforeEach } from 'vitest';
import { createCipheriv, randomBytes } from 'node:crypto';
import { Db } from '../../src/db/index.js';
import { Cipher } from '../../src/crypto/cipher.js';

const KEY = Buffer.from('a'.repeat(64), 'hex');

function enc(text: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', KEY, iv, { authTagLength: 16 });
  const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
}

function criarDb() {
  const cipher = new Cipher(KEY);
  return new Db(':memory:', cipher);
}

describe('Db.buscarConversasPendentes', () => {
  it('deve retornar lista vazia quando não há mensagens pendentes', () => {
    const db = criarDb();
    expect(db.buscarConversasPendentes()).toEqual([]);
    db.fechar();
  });

  it('deve agrupar mensagens do mesmo lead em uma única conversa', () => {
    const db = criarDb();
    // Inserir lead e mensagens diretamente via SQL interno
    const raw = (db as unknown as { db: import('better-sqlite3').Database }).db;
    const hash1 = require('node:crypto').createHash('sha256').update('5535999998888').digest('hex');
    raw.prepare('INSERT INTO leads (telefone_hash, telefone_cifrado, nome_cifrado, estagio, criado_em, atualizado_em) VALUES (?,?,?,?,?,?)')
      .run(hash1, enc('5535999998888'), enc('Ana'), 'Novo lead', 1000, 1000);
    const leadId = (raw.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;
    raw.prepare('INSERT INTO mensagens (lead_id, external_id, conteudo_cifrado, direcao, timestamp, instancia, processado, criado_em) VALUES (?,?,?,?,?,?,0,?)').run(leadId, 'ext-001', enc('Oi'), 'in', 1001, 'crm-gc', 1001);
    raw.prepare('INSERT INTO mensagens (lead_id, external_id, conteudo_cifrado, direcao, timestamp, instancia, processado, criado_em) VALUES (?,?,?,?,?,?,0,?)').run(leadId, 'ext-002', enc('Tenho interesse'), 'in', 1002, 'crm-gc', 1002);

    const conversas = db.buscarConversasPendentes();
    expect(conversas).toHaveLength(1);
    expect(conversas[0].telefone).toBe('5535999998888');
    expect(conversas[0].mensagens).toHaveLength(2);
    db.fechar();
  });
});

describe('Db.marcarProcessado', () => {
  it('deve remover lead da fila após marcar como processado', () => {
    const db = criarDb();
    const raw = (db as unknown as { db: import('better-sqlite3').Database }).db;
    const hash2 = require('node:crypto').createHash('sha256').update('5535111112222').digest('hex');
    raw.prepare('INSERT INTO leads (telefone_hash, telefone_cifrado, nome_cifrado, estagio, criado_em, atualizado_em) VALUES (?,?,?,?,?,?)')
      .run(hash2, enc('5535111112222'), enc('Carlos'), 'Novo lead', 1000, 1000);
    const leadId = (raw.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;
    raw.prepare('INSERT INTO mensagens (lead_id, external_id, conteudo_cifrado, direcao, timestamp, instancia, processado, criado_em) VALUES (?,?,?,?,?,?,0,?)').run(leadId, 'ext-003', enc('Msg'), 'in', 1001, 'crm-gc', 1001);

    expect(db.buscarConversasPendentes()).toHaveLength(1);
    db.marcarProcessado(leadId);
    expect(db.buscarConversasPendentes()).toHaveLength(0);
    db.fechar();
  });
});

describe('Db.getBatchEstado', () => {
  it('deve retornar estado inicial do batch', () => {
    const db = criarDb();
    const estado = db.getBatchEstado();
    expect(estado.status).toBe('idle');
    expect(estado.ultima_execucao).toBeNull();
    db.fechar();
  });

  it('deve atualizar status do batch corretamente', () => {
    const db = criarDb();
    db.setBatchStatus('ok', 5);
    const estado = db.getBatchEstado();
    expect(estado.status).toBe('ok');
    expect(estado.leads_afetados).toBe(5);
    db.fechar();
  });
});
