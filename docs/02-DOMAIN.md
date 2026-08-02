---
id: CRMGC-DOMAIN-002
title: Modelo do Domínio — CRM GC
version: 0.1.0
status: DRAFT
owner: CTO
depends_on:
  - CRMGC-CHARTER-000
  - CRMGC-VISION-001
last_update: 2026-07-15
---

# CRM GC — Domain Model

## 1. Conceitos Centrais (Single Source of Truth)

Todo conceito é definido uma única vez neste documento. Qualquer outro
documento que precise referenciar um conceito abaixo deve apontar para
este arquivo — nunca redefinir.

| Conceito | Definição oficial | Referenciado em |
|---|---|---|
| **Lead** | Pessoa que iniciou contato via WhatsApp e ainda não se tornou aluno matriculado | 02-DOMAIN (entidade Lead) |
| **Aluno** | Lead que concluiu a matrícula. Fora do escopo do MVP | 01-VISION (fora do escopo) |
| **Conversa** | Conjunto de mensagens trocadas com um Lead identificado por número de telefone, dentro de um período de 24h ou agrupadas por processamento | 02-DOMAIN (entidade Conversa) |
| **Mensagem** | Unidade individual de texto recebido de um Lead via WhatsApp | 02-DOMAIN (entidade Mensagem) |
| **Card** | Representação de um Lead no Notion, com campos estruturados que refletem o estado atual do relacionamento | 02-DOMAIN (entidade Card) |
| **Batch** | Execução programada do Processador que lê todas as conversas novas desde o último processamento e atualiza os Cards correspondentes | 02-DOMAIN (Processador) |
| **Trigger Manual** | Execução sob demanda do Processador, iniciada pelo CEO via painel web | 02-DOMAIN (Gateway) |
| **Estágio** | Estado atual do Lead no funil de vendas. Só pode assumir valores da lista oficial definida neste documento | 02-DOMAIN (estados do Lead) |
| **Característica Específica** | Condição sensível do aluno (TDAH, TEA, Dislexia, Alzheimer) — SOMENTE registrada quando o próprio lead mencionar espontaneamente | 02-DOMAIN (regras de negócio) |
| **Faixa Etária** | Categoria de turma do aluno, derivada da idade mencionada na conversa | 02-DOMAIN (regras de mapeamento) |

---

## 2. Entidades do Sistema

### 2.1 Mensagem

Unidade mínima de dado recebida pelo sistema.

```typescript
interface Mensagem {
  id: string                    // UUID gerado pelo sistema
  leadTelefone: string          // número no formato E.164 (ex: 5535999998888)
  leadNome: string              // nome retornado pela Evolution API
  corpo: string                 // texto da mensagem (criptografado em repouso)
  timestampWhatsApp: number     // unix timestamp da Meta
  timestampRecebido: Date       // quando o Message Store recebeu
  processado: boolean           // false até o Processador rodar
  processadoEm: Date | null     // quando foi processado
}
```

### 2.2 Conversa

Agrupamento de mensagens de um mesmo Lead para análise pela IA.

```typescript
interface Conversa {
  leadTelefone: string
  leadNome: string
  mensagens: Mensagem[]         // ordenadas por timestampWhatsApp ASC
  periodoInicio: Date
  periodoFim: Date
}
```

### 2.3 Lead (Card no Notion)

Estado atual do relacionamento com um contato.

```typescript
interface Lead {
  // Identificação
  notionPageId: string          // ID da página no Notion (chave primária)
  idLead: string                // ID único gerado pelo Notion (prefixo GC-)
  nomeCompleto: string          // criptografado em repouso no banco local
  telefone: string              // criptografado em repouso no banco local

  // Classificação (preenchida pela IA)
  quemBusca: QuemBusca | null
  faixaEtaria: FaixaEtaria | null
  caracteristicasEspecificas: CaracteristicaEspecifica[]

  // Funil
  estagio: Estagio
  motivoPerda: MotivoPerda | null   // obrigatório quando estagio === 'Perdido'
  tentativaFollowUp: TentativaFollowUp | null

  // Datas
  dataUltimoContato: Date
  proximoFollowUp: Date | null
  dataHoraAulaAgendada: Date | null

  // Histórico
  resumoConversa: string        // criptografado; atualizado pela IA a cada batch

  // Auditoria
  criadoEm: Date
  atualizadoEm: Date
}
```

### 2.4 ResultadoProcessamento

Saída da IA para cada Lead processado.

```typescript
interface ResultadoProcessamento {
  leadTelefone: string
  sucesso: boolean
  tentativasUsadas: number        // 1 a 4
  camposAtualizados: string[]     // quais campos foram alterados
  camposIncertos: string[]        // campos que a IA não teve confiança para preencher
  erroMensagem: string | null     // preenchido se sucesso === false após 4 tentativas
  timestampProcessamento: Date
}
```

---

## 3. Tipos Enumerados

### 3.1 Estágio (funil completo)

```typescript
type Estagio =
  | 'Novo lead'
  | 'Em qualificação'
  | 'Sem resposta'
  | 'Aula agendada'
  | 'Não compareceu'
  | 'Aula realizada'
  | 'Fez aula não matriculou'
  | 'Matriculado'
  | 'Perdido'
```

**Regra:** nenhum valor fora desta lista pode ser atribuído ao campo `estagio`.
Se a IA retornar um valor não reconhecido, o campo é mantido como estava e
o caso é registrado como `camposIncertos`.

### 3.2 QuemBusca

```typescript
type QuemBusca =
  | 'Para si mesmo'
  | 'Filho buscando para pai/mãe'
  | 'Pai/mãe buscando para filho'
  | 'Outro familiar'
```

### 3.3 FaixaEtaria

```typescript
type FaixaEtaria =
  | '6-7' | '8-9' | '10-11' | '12-14'
  | '15-17' | '18-30' | '30-60' | '60+'
```

**Regra de mapeamento por idade mencionada:**

| Idade mencionada | Faixa Etária |
|---|---|
| 6 ou 7 anos | 6-7 |
| 8 ou 9 anos | 8-9 |
| 10 ou 11 anos | 10-11 |
| 12, 13 ou 14 anos | 12-14 |
| 15, 16 ou 17 anos | 15-17 |
| 18 a 30 anos | 18-30 |
| 31 a 60 anos | 30-60 |
| 61 anos ou mais | 60+ |
| Idade não mencionada | null (campo incerto) |

### 3.4 CaracteristicaEspecifica

```typescript
type CaracteristicaEspecifica =
  | 'TDAH'
  | 'TEA'
  | 'Dislexia'
  | 'Início de Alzheimer / declínio cognitivo'
```

**Regra crítica (Charter):** este campo só é preenchido quando o próprio
lead mencionar a condição de forma espontânea. A IA nunca infere com base
em comportamento ou pistas indiretas. Lista vazia é o valor padrão.

### 3.5 MotivoPerda

```typescript
type MotivoPerda =
  | 'Preço'
  | 'Tempo'
  | 'Não convenceu'
  | 'Sem contato'
  | 'Precisa decidir em família'
```

**Regra:** obrigatório quando `estagio === 'Perdido'`. Nulo em todos os
outros estágios.

### 3.6 TentativaFollowUp

```typescript
type TentativaFollowUp = '1ª' | '2ª' | '3ª' | '4ª'
```

---

## 4. Estados do Lead e Transições Permitidas

```
Novo lead
  └─► Em qualificação
        ├─► Sem resposta ──────────────────────────► Perdido
        │     └─► Em qualificação (se responder)
        ├─► Aula agendada
        │     ├─► Não compareceu ─────────────────► Perdido
        │     │     └─► Aula agendada (reagendou)
        │     └─► Aula realizada
        │           ├─► Matriculado ✓
        │           └─► Fez aula não matriculou ───► Perdido
        │                 └─► Matriculado (fechou depois)
        └─► Perdido (recusou explicitamente)
```

**Regra:** a IA pode sugerir um avanço de estágio com base na conversa,
mas nunca pode regredir um estágio (ex: de "Aula realizada" para "Em
qualificação"). Regressões só ocorrem por intervenção manual do CEO no Notion.

---

## 5. Regras de Negócio Centrais

**RN-001 — Identificação de Lead:**
Um Lead é identificado pela combinação de `telefone` (obrigatório) +
`nomeCompleto` (secundário). Se o telefone já existe no banco mas o nome
é diferente, o sistema atualiza o nome e registra no log de auditoria.
Se o telefone não existe, um novo card é criado.

**RN-002 — Acompanhante obrigatório:**
Toda aula experimental marcada para menor de idade (faixas 6-7 a 15-17)
ou para público 60+ com Alzheimer exige acompanhante. Esta informação deve
constar no resumo da conversa quando relevante. O sistema não envia nenhuma
mensagem sobre isso — é um lembrete para o atendente humano.

**RN-003 — Retry de IA:**
O processamento de cada Lead pela IA usa um loop de no máximo 4 tentativas,
com delay de 30.000ms entre cada uma. Se todas falharem, o Lead é marcado
como `processado: false` no banco local, o erro é registrado no log de
auditoria, e o batch avança para o próximo Lead sem interromper a execução.

**RN-004 — Campos incertos:**
Quando a IA não tiver confiança suficiente para preencher um campo, ela
retorna o campo como string vazia e lista o campo em `camposIncertos`. O
sistema mantém o valor anterior do campo no Notion (não sobrescreve com
vazio). O campo `camposIncertos` é registrado no log de auditoria para
acompanhamento do CEO.

**RN-005 — Criptografia:**
Dados sensíveis armazenados no SQLite (telefone, nome, corpo das mensagens,
resumo da conversa) são criptografados com AES-256-GCM. A chave de
criptografia é lida de variável de ambiente `ENCRYPTION_KEY` — nunca
hardcoded. Em trânsito, toda comunicação entre serviços e com APIs externas
usa TLS 1.3.

**RN-006 — Horário do batch:**
O batch executa diariamente às 02h (horário configurável via variável de
ambiente `BATCH_CRON`). Processa todas as mensagens com `processado: false`
desde a última execução bem-sucedida.

**RN-007 — Log de auditoria:**
Toda operação de escrita no Notion (criação ou atualização de card) gera
uma entrada no log de auditoria com: timestamp, leadTelefone (hash),
campos alterados, valores anteriores e novos, e resultado
(sucesso/falha). O log é append-only e nunca é deletado no MVP.

---

## 6. Microsserviços — Responsabilidades e Contratos

### Serviço 1 — Evolution API
- **Responsabilidade:** conectar ao WhatsApp via QR Code, receber mensagens,
  disparar webhook para o Message Store
- **Tecnologia:** Docker (imagem oficial `atendai/evolution-api:v2.x`)
- **Expõe:** webhook POST para cada mensagem recebida
- **Contrato de saída (payload do webhook):**
```json
{
  "event": "messages.upsert",
  "instance": "string",
  "data": {
    "key": { "remoteJid": "5535999998888@s.whatsapp.net" },
    "pushName": "Nome do Lead",
    "message": { "conversation": "texto da mensagem" },
    "messageTimestamp": 1719500000
  }
}
```

### Serviço 2 — Message Store
- **Responsabilidade:** ouvir webhook da Evolution API, normalizar e
  persistir mensagens no SQLite com dados sensíveis criptografados
- **Tecnologia:** Node.js + TypeScript + Fastify + SQLite + better-sqlite3
- **Expõe:** endpoint POST `/webhook` (recebe da Evolution API)
- **Contrato de entrada:** payload da Evolution API (seção acima)
- **Contrato de saída:** tabela `mensagens` no SQLite (schema na seção 7)
- **NÃO FAZ:** nenhuma chamada à IA; nenhuma chamada ao Notion

### Serviço 3 — Processador
- **Responsabilidade:** ler mensagens não processadas do SQLite, agrupar
  por lead, chamar Gemini para análise, atualizar cards no Notion
- **Tecnologia:** Node.js + TypeScript + node-cron + @google/generative-ai + @notionhq/client
- **Acionado por:** cron (02h diário) ou chamada HTTP do Gateway
- **Contrato de entrada:** tabela `mensagens` do SQLite (via Message Store)
- **Contrato de saída:** cards atualizados no Notion + tabela `log_auditoria` no SQLite
- **NÃO FAZ:** nenhum envio de mensagem ao lead; nenhuma leitura direta do webhook

### Serviço 4 — Gateway
- **Responsabilidade:** expor endpoints HTTP para trigger manual e status;
  servir o painel web mínimo
- **Tecnologia:** Node.js + TypeScript + Fastify + HTML/CSS/JS vanilla (painel)
- **Expõe:**
  - `POST /trigger` — aciona o Processador imediatamente
  - `GET /status` — retorna status da última execução
  - `GET /` — serve o painel web mínimo
- **NÃO FAZ:** nenhum acesso direto ao SQLite; nenhuma chamada ao Notion

---

## 7. Schema do Banco de Dados (SQLite)

```sql
-- Mensagens recebidas via WhatsApp
CREATE TABLE mensagens (
  id TEXT PRIMARY KEY,                    -- UUID
  lead_telefone_hash TEXT NOT NULL,       -- SHA-256 do telefone (para busca sem descriptografar)
  lead_telefone_enc TEXT NOT NULL,        -- telefone criptografado AES-256-GCM
  lead_nome_enc TEXT NOT NULL,            -- nome criptografado AES-256-GCM
  corpo_enc TEXT NOT NULL,                -- texto da mensagem criptografado
  timestamp_whatsapp INTEGER NOT NULL,    -- unix timestamp
  timestamp_recebido TEXT NOT NULL,       -- ISO 8601
  processado INTEGER NOT NULL DEFAULT 0, -- 0=false, 1=true
  processado_em TEXT                      -- ISO 8601 ou NULL
);

-- Log de auditoria (append-only)
CREATE TABLE log_auditoria (
  id TEXT PRIMARY KEY,                    -- UUID
  timestamp TEXT NOT NULL,               -- ISO 8601
  operacao TEXT NOT NULL,                -- 'criar_card' | 'atualizar_card' | 'erro_ia' | 'erro_notion'
  lead_telefone_hash TEXT NOT NULL,      -- SHA-256 do telefone
  notion_page_id TEXT,                   -- NULL se criação falhou
  campos_alterados TEXT,                 -- JSON array de strings
  tentativas_ia INTEGER,                 -- 1-4
  sucesso INTEGER NOT NULL,              -- 0=false, 1=true
  erro_mensagem TEXT                     -- NULL se sucesso
);

-- Estado do batch (para controle de execução)
CREATE TABLE batch_estado (
  id INTEGER PRIMARY KEY DEFAULT 1,      -- sempre 1 (single row)
  ultimo_batch_inicio TEXT,              -- ISO 8601
  ultimo_batch_fim TEXT,                 -- ISO 8601
  ultimo_batch_sucesso INTEGER,          -- 0/1
  leads_processados INTEGER,
  leads_com_erro INTEGER
);

-- Índices para performance
CREATE INDEX idx_mensagens_telefone ON mensagens(lead_telefone_hash);
CREATE INDEX idx_mensagens_processado ON mensagens(processado);
CREATE INDEX idx_log_timestamp ON log_auditoria(timestamp);
```

---

## Suposições Pendentes de Validação

- [ ] **SUPOSIÇÃO-007:** O payload do webhook da Evolution API v2 segue o
  formato documentado na seção 6. Impacto se errada: o Message Store precisará
  de ajuste no parser de entrada antes de qualquer outra coisa.
- [ ] **SUPOSIÇÃO-008:** O Gemini Flash-Lite aceita o schema JSON definido
  no Processador sem modificações. Impacto se errada: ajuste no schema de
  saída da IA (já tivemos essa experiência com o n8n — problema conhecido).
- [ ] **SUPOSIÇÃO-009:** O Notion API v1 continua suportando todas as
  operações de escrita necessárias (criar página, atualizar propriedades
  multi-select). Impacto se errada: revisão dos endpoints do Processador.

---

## 8. Decisões Técnicas Registradas (CTO)

### DT-001 — Payload Evolution API v2 (SUPOSIÇÃO-007 RESOLVIDA)

O payload real do evento `messages.upsert` difere do formato genérico documentado
anteriormente. O Message Store deve implementar o seguinte parser defensivo:

```typescript
// Payload real confirmado pela documentação oficial e issues do GitHub
interface EvolutionWebhookPayload {
  event: string              // "messages.upsert"
  instance: string           // nome da instância
  data: {
    key: {
      remoteJid: string      // "5535999998888@s.whatsapp.net" OU "@lid" (anúncios)
      fromMe: boolean        // DEVE ser false para mensagens de leads
      id: string             // ID da mensagem no WhatsApp
    }
    pushName: string | null  // null quando vem de anúncio (FB Ads / Instagram)
    message: {
      conversation?: string  // texto simples
      // outros tipos: imageMessage, videoMessage, audioMessage, etc.
    }
    messageType: string      // "conversation" para texto simples
    messageTimestamp: number // unix timestamp
    source: string           // "android" | "ios" | "web"
    contextInfo?: {
      conversionSource?: string  // "FB_Ads" quando vem de anúncio
    }
  }
  date_time: string          // ISO 8601
  sender: string             // número do dono da instância
}

// Regras de parsing do Message Store:
// 1. Ignorar mensagens com data.key.fromMe === true (não são de leads)
// 2. Extrair telefone: remover sufixo @s.whatsapp.net ou @lid do remoteJid
// 3. pushName null → usar string vazia; o nome real virá do Notion ou ficará em branco
// 4. Suportar apenas messageType "conversation" no MVP; outros tipos são descartados com log
```

### DT-002 — Schema Gemini JSON (SUPOSIÇÃO-008 RESOLVIDA)

O Gemini Flash-Lite rejeita union types no JSON Schema (`"type": ["string", "null"]`).
O Processador deve usar apenas tipos simples com instrução em texto no campo description:

```typescript
// CORRETO — Gemini aceita
{ "type": "string", "description": "Usar string vazia se incerto" }
{ "type": "array", "items": { "type": "string" } }

// INCORRETO — Gemini rejeita
{ "type": ["string", "null"] }
```

Além disso, usar `responseMimeType: "application/json"` na chamada ao Gemini
para forçar retorno estruturado sem markdown.

### DT-003 — Notion API v1 (SUPOSIÇÃO-009 RESOLVIDA)

Notion API v1 suporta todas as operações necessárias. Sem impacto no Domain.
