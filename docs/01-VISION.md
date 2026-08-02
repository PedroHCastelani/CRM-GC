---
id: CRMGC-VISION-001
title: Visão e Escopo — CRM GC
version: 0.2.0
status: APPROVED
owner: CEO
depends_on:
  - CRMGC-CHARTER-000
last_update: 2026-07-15
---

# CRM GC — Vision

## 1. Problema Real que Este Projeto Resolve

O franqueado da Ginástica do Cérebro recebe entre 10 e 20 leads por dia via WhatsApp, provenientes de tráfego pago no Instagram. Todo o atendimento é feito manualmente por uma única pessoa. Sem histórico organizado, sem controle de estágio, sem cadência de follow-up — leads somem sem registro e oportunidades são perdidas por falta de acompanhamento. O gargalo não é a quantidade de leads: é a ausência de um sistema que organize automaticamente o que chega.

## 2. Para Quem

**Persona primária (MVP):** franqueado da Ginástica do Cérebro que opera sozinho no atendimento comercial, recebe leads via WhatsApp e precisa de controle de pipeline sem contratar uma equipe.

**Persona futura (pós-MVP):** outros negócios de serviço com volume similar de leads via WhatsApp — franquias, clínicas, escolas, studios — que enfrentam o mesmo problema de atendimento manual sem rastreabilidade.

## 3. Escopo da Primeira Versão (Dentro do MVP)

- [ ] Receber mensagens de leads via Evolution API (WhatsApp sem burocracia Meta)
- [ ] Armazenar mensagens recebidas em banco local (SQLite) via Message Store
- [ ] Identificar automaticamente se a mensagem é de lead novo ou existente (por telefone + nome)
- [ ] Criar card no Notion automaticamente quando for lead novo, com campos: Nome, Telefone, Estágio = "Novo lead", Data último contato
- [ ] Processar conversas via IA (Gemini Flash-Lite) para extrair e atualizar campos estruturados: Faixa etária, Quem busca, Características específicas (somente se mencionadas espontaneamente), Estágio, Próximo follow-up
- [ ] Loop de retry no processamento de IA: 4 tentativas por lead com 30.000ms de delay entre cada uma. Falha após 4 tentativas registra erro no log de auditoria e avança para o próximo lead sem travar o batch inteiro
- [ ] Atualizar cards existentes no Notion com as informações extraídas pela IA
- [ ] Executar processamento em modo batch diário (cron configurável, padrão 02h — horário de menor pico de uso das APIs de IA gratuitas)
- [ ] Expor trigger manual via painel web mínimo (botão "Processar agora")
- [ ] Painel web mínimo com status da última execução (sucesso/erro, quantidade de leads processados, timestamp)
- [ ] Painel web sem autenticação no MVP — acesso por IP restrito ou rede local
- [ ] Todos os dados sensíveis criptografados em repouso (AES-256) e em trânsito (TLS 1.3)
- [ ] Pipeline CI/CD com testes automatizados (TDD, Gherkin, cobertura mínima 80%)
- [ ] Logs de auditoria para todas as operações de escrita no Notion

## 4. Explicitamente Fora do Escopo (Por Enquanto)

- [ ] **Envio de mensagens automáticas para leads** — o sistema só lê e organiza, nunca envia. [motivo: princípio inegociável do Charter]
- [ ] **Sugestão de respostas prontas** — não faz parte do MVP. [motivo: simplificar escopo; adicionado na Fase 2]
- [ ] **Resumo de alunos por IA** — leitura do histórico completo para gerar resumo sob demanda. [motivo: feature de valor, não essencial para o controle de leads do MVP]
- [ ] **Website próprio** — Notion continua sendo o CRM no MVP. [motivo: investimento significativo; após validação do produto]
- [ ] **App mobile e desktop** — arquitetura prevê, mas não está no MVP. [motivo: painel web mínimo resolve o trigger manual]
- [ ] **Multi-tenant / multi-usuário** — MVP é para uma única instância. [motivo: camada de isolamento e autenticação não é prioridade agora]
- [ ] **Memória de longo prazo da IA** — banco de Memória Oficial não é portado para o MVP. [motivo: complexidade sem impacto direto no objetivo do MVP]
- [ ] **Integração com Meta Business Suite / WhatsApp API oficial** — MVP usa Evolution API. [motivo: burocracia de verificação inviabiliza o MVP]

## 5. Fases Previstas

| Fase | O que entrega | Critério de avanço para a próxima fase |
|---|---|---|
| **MVP** | Captura + organização automática de leads com IA, painel mínimo, batch + trigger manual | 7 dias consecutivos sem falha, 85% de campos corretos, zero leads perdidos |
| **Fase 2** | Sugestão de respostas prontas, resumo de aluno sob demanda, memória da IA | MVP validado por pelo menos 30 dias em produção real |
| **Fase 3** | Website próprio substituindo Notion, app mobile, multi-tenant para outros clientes | Fase 2 estável; pelo menos 1 cliente externo validado |

---

## Suposições Confirmadas

- [x] **SUPOSIÇÃO-004:** CONFIRMADA — painel web sem autenticação no MVP. Acesso por IP restrito ou rede local.
- [x] **SUPOSIÇÃO-005:** CONFIRMADA — batch às 02h (menor pico de uso da IA). Configurável via variável de ambiente.
- [x] **SUPOSIÇÃO-006:** CONFIRMADA — um único número de WhatsApp via Evolution API no MVP.
