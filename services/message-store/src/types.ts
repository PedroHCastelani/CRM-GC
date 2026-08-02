export interface MensagemNormalizada {
  externalId: string;
  telefone: string;
  pushName: string;
  conteudo: string;
  direcao: 'in' | 'out';
  timestamp: number;
  instancia: string;
}

export type ResultadoParser =
  | { ok: true; mensagem: MensagemNormalizada }
  | { ok: false; motivo: MotivoDescarte; detalhe?: string };

export type MotivoDescarte =
  | 'evento_ignorado'
  | 'mensagem_propria'
  | 'grupo'
  | 'tipo_nao_suportado'
  | 'sem_conteudo'
  | 'jid_invalido'
  | 'payload_invalido';
