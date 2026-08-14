import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Cipher } from '../crypto/cipher.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

export interface ConversaLead {
  leadId: number;
  telefone: string;
  nome: string;
  estagioAtual: string;
  notionPageId: string | null;
  mensagens: Array<{ conteudo: string; direcao: string; timestamp: number }>;
}

export interface BatchEstado {
  ultima_execucao: number | null;
  status: string;
  leads_afetados: number;
  erro: string | null;
}

export class Db {
  private readonly db: Database.Database;
  private readonly cipher: Cipher;

  constructor(caminho: string, cipher: Cipher) {
    if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
    this.db = new Database(caminho);
    this.db.exec(readFileSync(join(AQUI, 'schema.sql'), 'utf8'));
    this.cipher = cipher;
  }

  buscarConversasPendentes(): ConversaLead[] {
    const leads = this.db.prepare(`
      SELECT DISTINCT l.id, l.telefone_cifrado, l.nome_cifrado, l.estagio, l.notion_page_id
      FROM leads l
      JOIN mensagens m ON m.lead_id = l.id
      WHERE m.processado = 0
    `).all() as Array<{ id: number; telefone_cifrado: string; nome_cifrado: string; estagio: string; notion_page_id: string | null }>;

    return leads.map(l => {
      const msgs = this.db.prepare(`
        SELECT conteudo_cifrado, direcao, timestamp
        FROM mensagens WHERE lead_id = ? AND processado = 0
        ORDER BY timestamp ASC
      `).all(l.id) as Array<{ conteudo_cifrado: string; direcao: string; timestamp: number }>;

      return {
        leadId: l.id,
        telefone: this.cipher.decrypt(l.telefone_cifrado),
        nome: this.cipher.decrypt(l.nome_cifrado),
        estagioAtual: l.estagio,
        notionPageId: l.notion_page_id,
        mensagens: msgs.map(m => ({
          conteudo: this.cipher.decrypt(m.conteudo_cifrado),
          direcao: m.direcao,
          timestamp: m.timestamp,
        })),
      };
    });
  }

  marcarProcessado(leadId: number): void {
    this.db.prepare('UPDATE mensagens SET processado = 1 WHERE lead_id = ? AND processado = 0')
      .run(leadId);
  }

  atualizarNotionPageId(leadId: number, pageId: string): void {
    this.db.prepare('UPDATE leads SET notion_page_id = ? WHERE id = ?').run(pageId, leadId);
  }

  atualizarEstagio(leadId: number, estagio: string): void {
    const agora = Math.floor(Date.now() / 1000);
    this.db.prepare('UPDATE leads SET estagio = ?, atualizado_em = ? WHERE id = ?')
      .run(estagio, agora, leadId);
  }

  getBatchEstado(): BatchEstado {
    return this.db.prepare('SELECT * FROM batch_estado WHERE id = 1').get() as BatchEstado;
  }

  setBatchStatus(status: string, leadsAfetados?: number, erro?: string): void {
    const agora = Math.floor(Date.now() / 1000);
    this.db.prepare(`
      UPDATE batch_estado
      SET ultima_execucao = ?, status = ?, leads_afetados = ?, erro = ?
      WHERE id = 1
    `).run(agora, status, leadsAfetados ?? 0, erro ?? null);
  }

  saudavel(): boolean {
    try {
      const r = this.db.prepare('PRAGMA quick_check').get() as Record<string, string>;
      return Object.values(r)[0] === 'ok';
    } catch { return false; }
  }

  fechar(): void { this.db.close(); }
}
