import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    databases: { query: mockQuery },
    pages: { create: mockCreate, update: mockUpdate },
  })),
}));

const leadExistente = {
  id: 'page-123',
  properties: {
    'Estagio': { select: { name: 'Em qualificacao' } },
    'Faixa etaria': { select: null },
    'Quem busca': { select: null },
    'Caracteristicas especificas': { multi_select: [] },
    'Resumo da conversa': { rich_text: [{ plain_text: 'Resumo anterior.' }] },
  },
};

describe('NotionClient', async () => {
  const { NotionClient } = await import('../../src/notion/index.js');

  beforeEach(() => vi.clearAllMocks());

  it('buscarPorTelefone deve retornar null quando lead não existe', async () => {
    mockQuery.mockResolvedValueOnce({ results: [] });
    const n = new NotionClient('token', 'db-id');
    expect(await n.buscarPorTelefone('5535999998888')).toBeNull();
  });

  it('buscarPorTelefone deve retornar lead quando existe', async () => {
    mockQuery.mockResolvedValueOnce({ results: [leadExistente] });
    const n = new NotionClient('token', 'db-id');
    const lead = await n.buscarPorTelefone('5535999998888');
    expect(lead?.pageId).toBe('page-123');
    expect(lead?.estagio).toBe('Em qualificacao');
    expect(lead?.resumo).toBe('Resumo anterior.');
  });

  it('criarLead deve chamar pages.create e retornar pageId', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'page-novo' });
    const n = new NotionClient('token', 'db-id');
    const id = await n.criarLead('Ana', '5535999998888');
    expect(id).toBe('page-novo');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('criarLead deve usar nome padrão quando nome vazio', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'page-sem-nome' });
    const n = new NotionClient('token', 'db-id');
    await n.criarLead('', '5535999998888');
    const call = mockCreate.mock.calls[0][0];
    expect(call.properties['Nome do lead'].title[0].text.content).toBe('Lead sem nome');
  });

  it('atualizarLead deve bloquear regressão de estágio', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'page-123' });
    const n = new NotionClient('token', 'db-id');
    const alterados = await n.atualizarLead('page-123', {
      estagio: 'Novo lead',
      estagioAtual: 'Aula realizada',
    });
    expect(alterados).not.toContain('Estagio');
  });

  it('atualizarLead deve avançar estágio válido', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'page-123' });
    const n = new NotionClient('token', 'db-id');
    const alterados = await n.atualizarLead('page-123', {
      estagio: 'Aula agendada',
      estagioAtual: 'Em qualificacao',
    });
    expect(alterados).toContain('Estagio');
  });

  it('atualizarLead deve ignorar faixa etária inválida', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'page-123' });
    const n = new NotionClient('token', 'db-id');
    const alterados = await n.atualizarLead('page-123', { faixaEtaria: '200+' });
    expect(alterados).not.toContain('Faixa etaria');
  });

  it('atualizarLead não deve adicionar característica inválida', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'page-123' });
    const n = new NotionClient('token', 'db-id');
    const alterados = await n.atualizarLead('page-123', {
      caracteristicas: ['Bipolaridade'],
    });
    expect(alterados).not.toContain('Caracteristicas especificas');
  });

  it('atualizarLead deve atualizar quemBusca quando preenchido', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'page-123' });
    const n = new NotionClient('token', 'db-id');
    const alterados = await n.atualizarLead('page-123', { quemBusca: 'Para si mesmo' });
    expect(alterados).toContain('Quem busca');
  });

  it('atualizarLead deve atualizar proximoFollowUp quando preenchido', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'page-123' });
    const n = new NotionClient('token', 'db-id');
    const alterados = await n.atualizarLead('page-123', { proximoFollowUp: '2026-08-01' });
    expect(alterados).toContain('Proximo follow-up');
  });

  it('atualizarLead deve adicionar característica válida', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'page-123' });
    const n = new NotionClient('token', 'db-id');
    const alterados = await n.atualizarLead('page-123', { caracteristicas: ['TDAH'] });
    expect(alterados).toContain('Caracteristicas especificas');
  });

  it('atualizarLead não deve incluir Estagio quando estagioAtual é undefined', async () => {
    mockUpdate.mockResolvedValueOnce({ id: 'page-123' });
    const n = new NotionClient('token', 'db-id');
    const alterados = await n.atualizarLead('page-123', { estagio: 'Matriculado' });
    expect(alterados).not.toContain('Estagio');
  });
});
