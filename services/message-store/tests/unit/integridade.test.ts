import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function listarTs(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) return listarTs(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

describe('Integridade dos arquivos gerados (Incidente #005)', () => {
  const arquivos = listarTs('src');

  it('encontrou arquivos para verificar', () => {
    expect(arquivos.length).toBeGreaterThan(5);
  });

  it.each(arquivos)('%s nao contem vazamento de delimitador de heredoc', (f) => {
    const linhas = readFileSync(f, 'utf8').split('\n');
    const suspeitas = linhas.filter((l) => /^(F\d{2}(_PLACEHOLDER)?(=1)?|FIM|EOF|PJ)$/.test(l.trim()));
    expect(suspeitas).toEqual([]);
  });

  it.each(arquivos)('%s nao contem marcador de conflito do git', (f) => {
    const c = readFileSync(f, 'utf8');
    expect(c).not.toMatch(/^(<<<<<<<|=======|>>>>>>>)/m);
  });
});
