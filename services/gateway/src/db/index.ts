import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface BatchEstado {
  ultima_execucao: number | null;
  status: string;
  leads_afetados: number;
  erro: string | null;
}

export class Db {
  private readonly db: Database.Database;

  constructor(caminho: string) {
    if (caminho !== ':memory:') mkdirSync(dirname(caminho), { recursive: true });
    this.db = new Database(caminho, { readonly: true });
  }

  getBatchEstado(): BatchEstado | null {
    try {
      return this.db.prepare('SELECT * FROM batch_estado WHERE id = 1').get() as BatchEstado;
    } catch {
      return null;
    }
  }

  saudavel(): boolean {
    try {
      const r = this.db.prepare('PRAGMA quick_check').get() as Record<string, string>;
      return Object.values(r)[0] === 'ok';
    } catch { return false; }
  }

  fechar(): void { this.db.close(); }
}
