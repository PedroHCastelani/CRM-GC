import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config.js';

const original = { ...process.env };
beforeEach(() => { process.env = { ...original }; });
afterEach(() => { process.env = { ...original }; });

describe('loadConfig (item 018 - zero hardcode)', () => {
  it('carrega configuracao valida', () => {
    process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
    process.env['PORT'] = '3001';
    const c = loadConfig();
    expect(c.encryptionKey).toHaveLength(32);
    expect(c.port).toBe(3001);
  });

  it('falha se ENCRYPTION_KEY ausente', () => {
    delete process.env['ENCRYPTION_KEY'];
    expect(() => loadConfig()).toThrow(/ENCRYPTION_KEY/);
  });

  it.each(['abc', 'a'.repeat(63), 'z'.repeat(64), ''])(
    'rejeita ENCRYPTION_KEY invalida: %s',
    (v) => { process.env['ENCRYPTION_KEY'] = v; expect(() => loadConfig()).toThrow(); }
  );

  it('aplica defaults', () => {
    process.env['ENCRYPTION_KEY'] = 'a'.repeat(64);
    delete process.env['PORT'];
    delete process.env['SQLITE_PATH'];
    const c = loadConfig();
    expect(c.port).toBe(3001);
    expect(c.sqlitePath).toBe('/data/crm.db');
  });
});
