import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Cipher } from '../crypto/cipher.js';
import type { MensagemNormalizada, MotivoDescarte } from '../types.js';

const AQUI = dirname(fileURLToPath(import.meta.url));

export interface ResultadoPersistencia {
  leadId: number;
  mensagemId: number;
  duplicada: boolean;
  leadNovo: boolean;
}

export class Store {
  private readonly db: Database.Database;
  private readonly cipher: Cipher;

  constructor(caminho: string, cipher: Cipher) {
    if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
    this.db = new Database(caminho);
    this.cipher = cipher;
    this.db.exec(readFileSync(join(AQUI, 'schema.sql'), 'utf8'));
  }

  /** Hash deterministico do telefone - permite UNIQUE sem expor o dado (RN-005). */
  private hash(telefone: string): string {
    return createHash('sha256').update(telefone).digest('hex');
  }

  salvarMensagem(m: MensagemNormalizada): ResultadoPersistencia {
    const agora = Math.floor(Date.now() / 1000);
    const th = this.hash(m.telefone);

    return this.db.transaction((): ResultadoPersistencia => {
      let leadNovo = false;
      let lead = this.db.prepare('SELECT id FROM leads WHERE telefone_hash = ?')
        .get(th) as { id: number } | undefined;

      if (!lead) {
        const r = this.db.prepare(
          `INSERT INTO leads (telefone_hash, telefone_cifrado, nome_cifrado, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?)`
        ).run(th, this.cipher.encrypt(m.telefone), this.cipher.encrypt(m.pushName), agora, agora);
        lead = { id: Number(r.lastInsertRowid) };
        leadNovo = true;
      } else {
        this.db.prepare('UPDATE leads SET atualizado_em = ? WHERE id = ?').run(agora, lead.id);
        if (m.pushName !== '') {
          this.db.prepare(`UPDATE leads SET nome_cifrado = ? WHERE id = ? AND nome_cifrado = ''`)
            .run(this.cipher.encrypt(m.pushName), lead.id);
        }
      }

      const existente = this.db.prepare('SELECT id FROM mensagens WHERE external_id = ?')
        .get(m.externalId) as { id: number } | undefined;

      if (existente) {
        return { leadId: lead.id, mensagemId: existente.id, duplicada: true, leadNovo: false };
      }

      const rm = this.db.prepare(
        `INSERT INTO mensagens
           (lead_id, external_id, conteudo_cifrado, direcao, timestamp, instancia, processado, criado_em)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`
      ).run(lead.id, m.externalId, this.cipher.encrypt(m.conteudo),
            m.direcao, m.timestamp, m.instancia, agora);

      return { leadId: lead.id, mensagemId: Number(rm.lastInsertRowid), duplicada: false, leadNovo };
    })();
  }

  registrarDescarte(motivo: MotivoDescarte, detalhe?: string): void {
    this.db.prepare('INSERT INTO webhook_descartes (motivo, detalhe, criado_em) VALUES (?, ?, ?)')
      .run(motivo, detalhe ?? null, Math.floor(Date.now() / 1000));
  }

  /** Conversa em claro - consumida pelo Processador na Sprint 5. */
  conversaDoLead(leadId: number): Array<{ direcao: string; conteudo: string; timestamp: number }> {
    const rows = this.db.prepare(
      'SELECT direcao, conteudo_cifrado, timestamp FROM mensagens WHERE lead_id = ? ORDER BY timestamp ASC'
    ).all(leadId) as Array<{ direcao: string; conteudo_cifrado: string; timestamp: number }>;
    return rows.map((r) => ({
      direcao: r.direcao,
      conteudo: this.cipher.decrypt(r.conteudo_cifrado),
      timestamp: r.timestamp,
    }));
  }

  estatisticas(): { leads: number; mensagens: number; naoProcessadas: number; descartes: number } {
    const um = (sql: string): number => (this.db.prepare(sql).get() as { n: number }).n;
    return {
      leads: um('SELECT COUNT(*) AS n FROM leads'),
      mensagens: um('SELECT COUNT(*) AS n FROM mensagens'),
      naoProcessadas: um('SELECT COUNT(*) AS n FROM mensagens WHERE processado = 0'),
      descartes: um('SELECT COUNT(*) AS n FROM webhook_descartes'),
    };
  }

  saudavel(): boolean {
    try {
      const r = this.db.prepare('PRAGMA quick_check').get() as Record<string, string>;
      return Object.values(r)[0] === 'ok';
    } catch { return false; }
  }

  fechar(): void { this.db.close(); }
}
