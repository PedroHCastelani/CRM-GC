import type { Db } from '../db/index.js';
import type { GeminiClient } from '../gemini/index.js';
import type { NotionClient } from '../notion/index.js';
import type { ConversaLead } from '../db/index.js';

export interface ResultadoBatch {
  leadsProcessados: number;
  leadsComErro: number;
  erros: Array<{ leadId: number; erro: string }>;
}

export class Processor {
  constructor(
    private readonly db: Db,
    private readonly gemini: GeminiClient,
    private readonly notion: NotionClient,
  ) {}

  async executarBatch(): Promise<ResultadoBatch> {
    const inicio = new Date().toISOString();
    console.log(`[processor] Batch iniciado: ${inicio}`);
    this.db.setBatchStatus('rodando', 0);

    const conversas = this.db.buscarConversasPendentes();
    console.log(`[processor] ${conversas.length} conversa(s) pendente(s)`);

    let processados = 0;
    const erros: Array<{ leadId: number; erro: string }> = [];

    for (const conversa of conversas) {
      try {
        await this.processarConversa(conversa);
        processados++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[processor] Erro lead ${conversa.leadId}: ${msg}`);
        erros.push({ leadId: conversa.leadId, erro: msg });
      }
    }

    this.db.setBatchStatus(
      erros.length === 0 ? 'ok' : 'parcial',
      processados,
      erros.length ? erros.map(e => e.erro).join('; ') : undefined,
    );

    console.log(`[processor] Batch concluido. Processados: ${processados}, Erros: ${erros.length}`);
    return { leadsProcessados: processados, leadsComErro: erros.length, erros };
  }

  private async processarConversa(conversa: ConversaLead): Promise<void> {
    // Buscar ou criar card no Notion
    let leadNotion = await this.notion.buscarPorTelefone(conversa.telefone);
    let pageId: string;

    if (!leadNotion) {
      pageId = await this.notion.criarLead(conversa.nome, conversa.telefone);
      this.db.atualizarNotionPageId(conversa.leadId, pageId);
    } else {
      pageId = leadNotion.pageId;
    }

    // Montar prompt com histórico da conversa
    const historico = conversa.mensagens
      .map(m => `[${new Date(m.timestamp * 1000).toISOString()}] ${m.direcao === 'in' ? 'Lead' : 'Atendente'}: ${m.conteudo}`)
      .join('\n');

    const prompt = [
      'LEAD:',
      `Nome: ${conversa.nome}`,
      `Telefone: ${conversa.telefone}`,
      `Estagio atual: ${conversa.estagioAtual || 'Novo lead'}`,
      `Faixa etaria: ${leadNotion?.faixaEtaria || ''}`,
      `Quem busca: ${leadNotion?.quemBusca || ''}`,
      `Caracteristicas: ${JSON.stringify(leadNotion?.caracteristicas ?? [])}`,
      `Resumo anterior: ${leadNotion?.resumo || 'sem historico'}`,
      '',
      `DATA DE HOJE: ${new Date().toISOString().split('T')[0]}`,
      '',
      'MENSAGENS DO DIA:',
      historico,
    ].join('\n');

    const { resultado, tentativas } = await this.gemini.analisarConversa(prompt);
    console.log(`[processor] Lead ${conversa.leadId} analisado em ${tentativas} tentativa(s)`);

    // Atualizar Notion com RN-004 (nao sobrescrever com vazio) e nao-regressao
    await this.notion.atualizarLead(pageId, {
      estagio: resultado.estagioMudou ? resultado.estagioNovo : undefined,
      estagioAtual: conversa.estagioAtual,
      faixaEtaria: resultado.faixaEtaria || undefined,
      quemBusca: resultado.quemBusca || undefined,
      caracteristicas: resultado.caracteristicasEspecificas,
      resumo: resultado.resumoConversaAtualizado || undefined,
      proximoFollowUp: resultado.proximoFollowUp || undefined,
    });

    // Atualizar estagio no SQLite se mudou
    if (resultado.estagioMudou && resultado.estagioNovo) {
      this.db.atualizarEstagio(conversa.leadId, resultado.estagioNovo);
    }

    // Marcar mensagens como processadas
    this.db.marcarProcessado(conversa.leadId);
  }
}
