/**
 * Testes de integração com mocks: Processor, Notion, Gemini, Routes
 * Cobre cenários Gherkin 5.2 do Blueprint
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockBuscarConversas = vi.fn();
const mockMarcar = vi.fn();
const mockSetBatch = vi.fn();
const mockGetBatch = vi.fn().mockReturnValue({ status: 'ok', ultima_execucao: null, leads_afetados: 0, erro: null });
const mockSaudavel = vi.fn().mockReturnValue(true);
const mockAtualizarNPId = vi.fn();
const mockAtualizarEstagio = vi.fn();

const mockDb = {
  buscarConversasPendentes: mockBuscarConversas,
  marcarProcessado: mockMarcar,
  setBatchStatus: mockSetBatch,
  getBatchEstado: mockGetBatch,
  atualizarNotionPageId: mockAtualizarNPId,
  atualizarEstagio: mockAtualizarEstagio,
  saudavel: mockSaudavel,
};

const mockBuscarPorTelefone = vi.fn();
const mockCriarLead = vi.fn().mockResolvedValue('page-novo-id');
const mockAtualizarLead = vi.fn().mockResolvedValue(['Resumo da conversa', 'Faixa etaria']);

const mockNotion = {
  buscarPorTelefone: mockBuscarPorTelefone,
  criarLead: mockCriarLead,
  atualizarLead: mockAtualizarLead,
};

const mockAnalisar = vi.fn();
const mockGemini = { analisarConversa: mockAnalisar };

const resultadoIaValido = {
  faixaEtaria: '8-9',
  quemBusca: 'Pai/mae buscando para filho',
  caracteristicasEspecificas: [],
  estagioNovo: 'Em qualificacao',
  estagioMudou: false,
  resumoConversaAtualizado: 'Filho de 9 anos. Interesse em aulas.',
  proximoFollowUp: '',
  camposIncertos: [],
  observacaoProposta: '',
  evidenciaObservacao: '',
};

const conversaTeste = {
  leadId: 1,
  telefone: '5535999998888',
  nome: 'Ana Santos',
  estagioAtual: 'Novo lead',
  notionPageId: null,
  mensagens: [{ conteudo: 'Meu filho tem 9 anos', direcao: 'in', timestamp: 1719500000 }],
};

// ─── Processor ────────────────────────────────────────────────────────────────

describe('Processor.executarBatch', async () => {
  const { Processor } = await import('../../src/processor/index.js');

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalisar.mockResolvedValue({ resultado: resultadoIaValido, tentativas: 1 });
  });

  it('deve criar card para lead novo quando não existe no Notion', async () => {
    mockBuscarConversas.mockReturnValue([conversaTeste]);
    mockBuscarPorTelefone.mockResolvedValue(null);
    mockBuscarPorTelefone.mockResolvedValueOnce(null).mockResolvedValueOnce({
      pageId: 'page-novo-id', estagio: 'Novo lead', faixaEtaria: '',
      quemBusca: '', caracteristicas: [], resumo: '',
    });

    const p = new Processor(mockDb as never, mockGemini as never, mockNotion as never);
    const r = await p.executarBatch();

    expect(mockCriarLead).toHaveBeenCalledWith('Ana Santos', '5535999998888');
    expect(r.leadsProcessados).toBe(1);
    expect(r.leadsComErro).toBe(0);
  });

  it('deve atualizar card existente sem criar novo', async () => {
    mockBuscarConversas.mockReturnValue([conversaTeste]);
    mockBuscarPorTelefone.mockResolvedValue({
      pageId: 'page-existente', estagio: 'Em qualificacao',
      faixaEtaria: '', quemBusca: '', caracteristicas: [], resumo: '',
    });

    const p = new Processor(mockDb as never, mockGemini as never, mockNotion as never);
    await p.executarBatch();

    expect(mockCriarLead).not.toHaveBeenCalled();
    expect(mockAtualizarLead).toHaveBeenCalled();
  });

  it('deve registrar erro e avançar sem travar quando IA falha', async () => {
    const c2 = { ...conversaTeste, leadId: 2, telefone: '5535000001111' };
    mockBuscarConversas.mockReturnValue([conversaTeste, c2]);
    mockBuscarPorTelefone.mockResolvedValue({
      pageId: 'page-x', estagio: 'Novo lead',
      faixaEtaria: '', quemBusca: '', caracteristicas: [], resumo: '',
    });
    mockAnalisar
      .mockRejectedValueOnce(new Error('Gemini indisponivel apos 4 tentativas'))
      .mockResolvedValueOnce({ resultado: resultadoIaValido, tentativas: 1 });

    const p = new Processor(mockDb as never, mockGemini as never, mockNotion as never);
    const r = await p.executarBatch();

    expect(r.leadsComErro).toBe(1);
    expect(r.leadsProcessados).toBe(1);
  });

  it('deve concluir com zero leads quando não há mensagens pendentes', async () => {
    mockBuscarConversas.mockReturnValue([]);
    const p = new Processor(mockDb as never, mockGemini as never, mockNotion as never);
    const r = await p.executarBatch();
    expect(r.leadsProcessados).toBe(0);
    expect(r.leadsComErro).toBe(0);
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

describe('Routes /health e /run', async () => {
  const Fastify = (await import('fastify')).default;
  const { registerRoutes } = await import('../../src/routes/index.js');
  const { Processor } = await import('../../src/processor/index.js');

  it('GET /health deve retornar 200 quando saudável', async () => {
    const app = Fastify({ logger: false });
    const p = new Processor(mockDb as never, mockGemini as never, mockNotion as never);
    await registerRoutes(app, p, mockDb as never);
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
    await app.close();
  });

  it('GET /health deve retornar 503 quando banco indisponível', async () => {
    const dbDoente = { ...mockDb, saudavel: () => false };
    const app = Fastify({ logger: false });
    const p = new Processor(mockDb as never, mockGemini as never, mockNotion as never);
    await registerRoutes(app, p, dbDoente as never);
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('POST /run deve retornar 202 e iniciar processamento', async () => {
    mockBuscarConversas.mockReturnValue([]);
    const app = Fastify({ logger: false });
    const p = new Processor(mockDb as never, mockGemini as never, mockNotion as never);
    await registerRoutes(app, p, mockDb as never);
    await app.ready();
    const res = await app.inject({ method: 'POST', url: '/run' });
    expect(res.statusCode).toBe(202);
    expect(JSON.parse(res.body).ok).toBe(true);
    await app.close();
  });

  it('GET /status deve retornar estado do batch', async () => {
    const app = Fastify({ logger: false });
    const p = new Processor(mockDb as never, mockGemini as never, mockNotion as never);
    await registerRoutes(app, p, mockDb as never);
    await app.ready();
    const res = await app.inject({ method: 'GET', url: '/status' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('ok');
    await app.close();
  });
});
