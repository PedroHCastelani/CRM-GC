import { Client } from '@notionhq/client';

const ESTAGIOS = [
  'Novo lead','Em qualificacao','Sem resposta','Aula agendada',
  'Nao compareceu','Aula realizada','Fez aula nao matriculou','Matriculado','Perdido',
];

const FAIXAS = ['6-7','8-9','10-11','12-14','15-17','18-30','30-60','60+'];

const CARACTERISTICAS = ['TDAH','TEA','Dislexia','Inicio de Alzheimer / declinio cognitivo'];

function naoRegride(atual: string, novo: string): boolean {
  const ia = ESTAGIOS.indexOf(atual);
  const in_ = ESTAGIOS.indexOf(novo);
  return ia !== -1 && in_ !== -1 && in_ >= ia;
}

function extrairSelect(p: unknown): string {
  return (p as { select?: { name?: string } })?.select?.name ?? '';
}

function extrairRichText(p: unknown): string {
  return (p as { rich_text?: Array<{ plain_text?: string }> })?.rich_text?.[0]?.plain_text ?? '';
}

export interface LeadNotion {
  pageId: string;
  estagio: string;
  faixaEtaria: string;
  quemBusca: string;
  caracteristicas: string[];
  resumo: string;
}

export class NotionClient {
  private readonly client: Client;
  private readonly dbId: string;

  constructor(token: string, dbId: string) {
    this.client = new Client({ auth: token });
    this.dbId = dbId;
  }

  async buscarPorTelefone(telefone: string): Promise<LeadNotion | null> {
    const res = await this.client.databases.query({
      database_id: this.dbId,
      filter: { property: 'Telefone', rich_text: { equals: telefone } },
      page_size: 1,
    });
    if (!res.results.length) return null;
    const p = res.results[0] as { id: string; properties: Record<string, unknown> };
    return {
      pageId: p.id,
      estagio: extrairSelect(p.properties['Estagio']),
      faixaEtaria: extrairSelect(p.properties['Faixa etaria']),
      quemBusca: extrairSelect(p.properties['Quem busca']),
      caracteristicas: ((p.properties['Caracteristicas especificas'] as { multi_select?: Array<{ name: string }> })?.multi_select ?? []).map(s => s.name),
      resumo: extrairRichText(p.properties['Resumo da conversa']),
    };
  }

  async criarLead(nome: string, telefone: string): Promise<string> {
    const page = await this.client.pages.create({
      parent: { database_id: this.dbId },
      properties: {
        'Nome do lead': { title: [{ text: { content: nome || 'Lead sem nome' } }] },
        'Telefone': { rich_text: [{ text: { content: telefone } }] },
        'Estagio': { select: { name: 'Novo lead' } },
        'Data ultimo contato': { date: { start: new Date().toISOString() } },
      },
    });
    return page.id;
  }

  async atualizarLead(pageId: string, dados: {
    estagio?: string;
    estagioAtual?: string;
    faixaEtaria?: string;
    quemBusca?: string;
    caracteristicas?: string[];
    resumo?: string;
    proximoFollowUp?: string;
  }): Promise<string[]> {
    const props: Record<string, unknown> = {};
    const alterados: string[] = [];

    props['Data ultimo contato'] = { date: { start: new Date().toISOString() } };
    alterados.push('Data ultimo contato');

    if (dados.resumo) {
      props['Resumo da conversa'] = { rich_text: [{ text: { content: dados.resumo } }] };
      alterados.push('Resumo da conversa');
    }
    if (dados.faixaEtaria && FAIXAS.includes(dados.faixaEtaria)) {
      props['Faixa etaria'] = { select: { name: dados.faixaEtaria } };
      alterados.push('Faixa etaria');
    }
    if (dados.quemBusca) {
      props['Quem busca'] = { select: { name: dados.quemBusca } };
      alterados.push('Quem busca');
    }
    if (dados.caracteristicas?.length) {
      const validas = dados.caracteristicas.filter(c => CARACTERISTICAS.includes(c));
      if (validas.length) {
        props['Caracteristicas especificas'] = { multi_select: validas.map(n => ({ name: n })) };
        alterados.push('Caracteristicas especificas');
      }
    }
    if (dados.estagio && dados.estagioAtual !== undefined && naoRegride(dados.estagioAtual, dados.estagio)) {
      props['Estagio'] = { select: { name: dados.estagio } };
      alterados.push('Estagio');
    }
    if (dados.proximoFollowUp) {
      props['Proximo follow-up'] = { date: { start: dados.proximoFollowUp } };
      alterados.push('Proximo follow-up');
    }

    await this.client.pages.update({ page_id: pageId, properties: props as Parameters<typeof this.client.pages.update>[0]['properties'] });
    return alterados;
  }
}
