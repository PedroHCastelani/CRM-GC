import { GoogleGenerativeAI, type GenerateContentResult } from '@google/generative-ai';

export interface ResultadoIA {
  faixaEtaria: string;
  quemBusca: string;
  caracteristicasEspecificas: string[];
  estagioNovo: string;
  estagioMudou: boolean;
  resumoConversaAtualizado: string;
  proximoFollowUp: string;
  camposIncertos: string[];
  observacaoProposta: string;
  evidenciaObservacao: string;
}

const SCHEMA = {
  type: 'object',
  properties: {
    faixaEtaria:               { type: 'string', description: 'Faixa etaria do aluno. String vazia se incerto.' },
    quemBusca:                 { type: 'string', description: 'Quem busca o atendimento. String vazia se incerto.' },
    caracteristicasEspecificas:{ type: 'array', items: { type: 'string' } },
    estagioNovo:               { type: 'string' },
    estagioMudou:              { type: 'boolean' },
    resumoConversaAtualizado:  { type: 'string' },
    proximoFollowUp:           { type: 'string', description: 'Data YYYY-MM-DD ou string vazia.' },
    camposIncertos:            { type: 'array', items: { type: 'string' } },
    observacaoProposta:        { type: 'string' },
    evidenciaObservacao:       { type: 'string' },
  },
  required: [
    'faixaEtaria','quemBusca','caracteristicasEspecificas',
    'estagioNovo','estagioMudou','resumoConversaAtualizado',
    'proximoFollowUp','camposIncertos','observacaoProposta','evidenciaObservacao',
  ],
};

const SYSTEM = `Voce e o assistente de analise de conversas da Ginastica do Cerebro.
REGRAS:
- Nunca inferir TDAH/TEA/Dislexia/Alzheimer sem mencao espontanea do lead.
- Nunca regredir estagio do lead.
- Quando incerto, usar string vazia e listar em camposIncertos.
- Estagios validos: Novo lead, Em qualificacao, Sem resposta, Aula agendada,
  Nao compareceu, Aula realizada, Fez aula nao matriculou, Matriculado, Perdido.
- Faixas etarias validas: 6-7, 8-9, 10-11, 12-14, 15-17, 18-30, 30-60, 60+.`;

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export class GeminiClient {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: string;
  private readonly retryMax: number;
  private readonly retryDelay: number;

  constructor(apiKey: string, model: string, retryMax: number, retryDelay: number) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
    this.retryMax = retryMax;
    this.retryDelay = retryDelay;
  }

  async analisarConversa(prompt: string): Promise<{ resultado: ResultadoIA; tentativas: number }> {
    const gemini = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: SYSTEM,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCHEMA as never,
        temperature: 0.2,
      },
    });

    let ultimo: Error = new Error('Nenhuma tentativa');
    for (let t = 1; t <= this.retryMax; t++) {
      try {
        const r: GenerateContentResult = await gemini.generateContent(prompt);
        const resultado = JSON.parse(r.response.text()) as ResultadoIA;
        return { resultado, tentativas: t };
      } catch (err) {
        ultimo = err instanceof Error ? err : new Error(String(err));
        const temporario = /503|429|UNAVAILABLE|overloaded|quota/i.test(ultimo.message);
        if (temporario && t < this.retryMax) {
          await delay(this.retryDelay);
          continue;
        }
        break;
      }
    }
    throw new Error(`Gemini indisponivel apos ${this.retryMax} tentativas: ${ultimo.message}`);
  }
}
