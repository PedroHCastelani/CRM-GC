import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGenerateContent = vi.fn();
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

const resultadoValido = {
  faixaEtaria: '60+', quemBusca: 'Filho buscando para pai/mae',
  caracteristicasEspecificas: [], estagioNovo: 'Aula agendada',
  estagioMudou: true, resumoConversaAtualizado: 'Filho busca para pai.',
  proximoFollowUp: '2026-08-01', camposIncertos: [],
  observacaoProposta: '', evidenciaObservacao: '',
};

describe('GeminiClient.analisarConversa', async () => {
  const { GeminiClient } = await import('../../src/gemini/index.js');

  beforeEach(() => vi.clearAllMocks());

  it('deve retornar resultado e tentativas=1 no sucesso imediato', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify(resultadoValido) }
    });
    const c = new GeminiClient('key', 'gemini-flash', 4, 10);
    const { resultado, tentativas } = await c.analisarConversa('prompt');
    expect(tentativas).toBe(1);
    expect(resultado.faixaEtaria).toBe('60+');
  });

  it('deve fazer retry em erro 503 e ter sucesso na 2ª tentativa', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 UNAVAILABLE'))
      .mockResolvedValueOnce({ response: { text: () => JSON.stringify(resultadoValido) } });
    const c = new GeminiClient('key', 'gemini-flash', 4, 10);
    const { tentativas } = await c.analisarConversa('prompt');
    expect(tentativas).toBe(2);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('deve lançar erro após esgotar todas as tentativas', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 overloaded'));
    const c = new GeminiClient('key', 'gemini-flash', 4, 10);
    await expect(c.analisarConversa('prompt')).rejects.toThrow('indisponivel');
    expect(mockGenerateContent).toHaveBeenCalledTimes(4);
  });

  it('deve falhar imediatamente em erro não temporário', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('401 Unauthorized'));
    const c = new GeminiClient('key', 'gemini-flash', 4, 10);
    await expect(c.analisarConversa('prompt')).rejects.toThrow();
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('deve lançar erro em erro de quota', async () => {
    mockGenerateContent.mockRejectedValue(new Error('quota exceeded'));
    const c = new GeminiClient('key', 'gemini-flash', 4, 10);
    await expect(c.analisarConversa('prompt')).rejects.toThrow();
  });
});
