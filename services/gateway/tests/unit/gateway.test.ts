import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetBatch = vi.fn().mockReturnValue({
  ultima_execucao: 1719500000,
  status: 'ok',
  leads_afetados: 5,
  erro: null,
});
const mockSaudavel = vi.fn().mockReturnValue(true);
const mockDb = { getBatchEstado: mockGetBatch, saudavel: mockSaudavel, fechar: vi.fn() };

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildApp(allowedIps = ['127.0.0.1'], processadorUrl = 'http://processador:3002') {
  const { registerIpFilter } = await import('../../src/middleware/ipFilter.js');
  const { healthRoute } = await import('../../src/routes/health.js');
  const { statusRoute } = await import('../../src/routes/status.js');
  const { triggerRoute } = await import('../../src/routes/trigger.js');
  const { painelRoute } = await import('../../src/routes/painel.js');

  const app = Fastify({ logger: false, trustProxy: true });
  registerIpFilter(app, allowedIps);
  await healthRoute(app, mockDb as never);
  await statusRoute(app, mockDb as never);
  await triggerRoute(app, processadorUrl);
  await painelRoute(app);
  await app.ready();
  return app;
}

// ─── GET /health ─────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('deve retornar 200 quando banco está saudável', async () => {
    mockSaudavel.mockReturnValue(true);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
    await app.close();
  });

  it('deve retornar 503 quando banco está indisponível', async () => {
    mockSaudavel.mockReturnValue(false);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).status).toBe('error');
    await app.close();
    mockSaudavel.mockReturnValue(true);
  });

  it('deve retornar 200 mesmo de IP não autorizado (health sempre livre)', async () => {
    const app = await buildApp(['10.0.0.1']);
    const res = await app.inject({ method: 'GET', url: '/health', remoteAddress: '192.168.1.1' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});

// ─── GET /status ─────────────────────────────────────────────────────────────

describe('GET /status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deve retornar 200 com estado do batch', async () => {
    mockGetBatch.mockReturnValue({ ultima_execucao: 1719500000, status: 'ok', leads_afetados: 5, erro: null });
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/status' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.leads_afetados).toBe(5);
    await app.close();
  });

  it('deve retornar 503 quando estado do batch é null', async () => {
    mockGetBatch.mockReturnValue(null);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/status' });
    expect(res.statusCode).toBe(503);
    await app.close();
  });
});

// ─── POST /trigger ────────────────────────────────────────────────────────────

describe('POST /trigger', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deve retornar 202 quando Processador inicia com sucesso', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 202 });
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/trigger' });
    expect(res.statusCode).toBe(202);
    expect(JSON.parse(res.body).ok).toBe(true);
    await app.close();
  });

  it('deve retornar 409 quando Processador já está rodando', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 409 });
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/trigger' });
    expect(res.statusCode).toBe(409);
    await app.close();
  });

  it('deve retornar 503 quando Processador está indisponível (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/trigger' });
    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).mensagem).toContain('indisponivel');
    await app.close();
  });

  it('deve retornar 503 quando Processador retorna erro inesperado', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/trigger' });
    expect(res.statusCode).toBe(503);
    await app.close();
  });
});

// ─── GET / (painel web) ───────────────────────────────────────────────────────

describe('GET / (painel web)', () => {
  it('deve retornar 200 com HTML do painel', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('Processar agora');
    await app.close();
  });
});

// ─── Middleware de IP ─────────────────────────────────────────────────────────

describe('Filtro de IP', () => {
  it('deve bloquear IP não autorizado com 403', async () => {
    const app = await buildApp(['10.0.0.1']);
    const res = await app.inject({ method: 'GET', url: '/status', remoteAddress: '192.168.1.99' });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('deve permitir IP autorizado', async () => {
    mockGetBatch.mockReturnValue({ ultima_execucao: null, status: 'idle', leads_afetados: 0, erro: null });
    const app = await buildApp(['192.168.1.50']);
    const res = await app.inject({ method: 'GET', url: '/status', remoteAddress: '192.168.1.50' });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});

// ─── config ───────────────────────────────────────────────────────────────────

describe('loadConfig', () => {
  afterEach(() => {
    ['PORT','SQLITE_PATH','PROCESSADOR_URL','ALLOWED_IPS','LOG_LEVEL'].forEach(k => delete process.env[k]);
  });

  it('deve carregar defaults quando variáveis não definidas', async () => {
    const { loadConfig } = await import('../../src/config/index.js');
    const cfg = loadConfig();
    expect(cfg.port).toBe(3003);
    expect(cfg.allowedIps).toContain('127.0.0.1');
    expect(cfg.processadorUrl).toBe('http://processador:3002');
  });

  it('deve aplicar ALLOWED_IPS separados por vírgula', async () => {
    process.env.ALLOWED_IPS = '10.0.0.1,10.0.0.2';
    const { loadConfig } = await import('../../src/config/index.js');
    const cfg = loadConfig();
    expect(cfg.allowedIps).toHaveLength(2);
    expect(cfg.allowedIps).toContain('10.0.0.1');
  });
});

// ─── Db (Gateway — read-only) ────────────────────────────────────────────────

describe('Db do Gateway', async () => {
  const { Db } = await import('../../src/db/index.js');

  it('saudavel() deve retornar true com banco em memória', () => {
    // Gateway usa readonly — simular com banco real em memória via better-sqlite3
    // O constructor com :memory: funcionará em modo de leitura se a tabela existir
    // Usamos um DB separado para preencher e depois abrimos readonly
    const Database = require('better-sqlite3');
    const tmp = require('node:os').tmpdir() + '/crm-gc-test-' + Date.now() + '.db';
    const setup = new Database(tmp);
    setup.exec('CREATE TABLE IF NOT EXISTS batch_estado (id INTEGER PRIMARY KEY DEFAULT 1, ultima_execucao INTEGER, status TEXT DEFAULT \'idle\', leads_afetados INTEGER DEFAULT 0, erro TEXT); INSERT OR IGNORE INTO batch_estado (id) VALUES (1);');
    setup.close();
    process.env.SQLITE_PATH = tmp;
    const db = new Db(tmp);
    expect(db.saudavel()).toBe(true);
    db.fechar();
    delete process.env.SQLITE_PATH;
  });

  it('getBatchEstado() deve retornar estado quando tabela existe', () => {
    const Database = require('better-sqlite3');
    const tmp = require('node:os').tmpdir() + '/crm-gc-test2-' + Date.now() + '.db';
    const setup = new Database(tmp);
    setup.exec('CREATE TABLE IF NOT EXISTS batch_estado (id INTEGER PRIMARY KEY DEFAULT 1, ultima_execucao INTEGER, status TEXT DEFAULT \'idle\', leads_afetados INTEGER DEFAULT 0, erro TEXT); INSERT OR IGNORE INTO batch_estado (id) VALUES (1);');
    setup.close();
    const db = new Db(tmp);
    const estado = db.getBatchEstado();
    expect(estado).not.toBeNull();
    expect(estado?.status).toBe('idle');
    db.fechar();
  });

  it('getBatchEstado() deve retornar null quando tabela não existe', () => {
    const Database = require('better-sqlite3');
    const tmp = require('node:os').tmpdir() + '/crm-gc-test3-' + Date.now() + '.db';
    const setup = new Database(tmp);
    setup.close();
    const db = new Db(tmp);
    const estado = db.getBatchEstado();
    expect(estado).toBeNull();
    db.fechar();
  });
});
