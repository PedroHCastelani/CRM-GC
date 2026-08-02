---
id: CRMGC-TRACE-004
title: Rastreabilidade do Projeto — CRM GC
version: 0.1.0
status: DRAFT
owner: CTO + QA
depends_on:
  - CRMGC-OPS-003A
  - CRMGC-OPS-003B
last_update: 2026-07-15
---

# CRM GC — Traceability Matrix

## Regra de Ouro
Nada é considerado "pronto" sem uma linha nesta tabela com status
validado pelo Agente de QA. O CTO fecha incidentes. O CEO aprova go-live.

---

## 1. Matriz de Rastreabilidade

| # | Item planejado | Agente responsável | Sprint | Status | Validado por QA | Aprovado por |
|---|---|---|---|---|---|---|
| 001 | VPS provisionado com Docker instalado | Infraestrutura | 1 | Não iniciado | — | — |
| 002 | Docker Compose com todos os serviços definidos | Infraestrutura | 1 | Não iniciado | — | — |
| 003 | Variáveis de ambiente centralizadas, zero hardcode | SecOps | 1 | Não iniciado | — | — |
| 004 | Pipeline CI/CD esqueleto configurado | DevOps | 1 | Não iniciado | — | — |
| 005 | Pipeline bloqueia merge se testes falham | DevOps | 1 | Não iniciado | — | — |
| 006 | Pipeline bloqueia merge se cobertura < 80% | DevOps | 1 | Não iniciado | — | — |
| 007 | Backup automático do SQLite configurado | Infraestrutura | 1 | Não iniciado | — | — |
| 008 | TLS 1.3 em todas as conexões externas | SecOps | 1 | Não iniciado | — | — |
| 009 | Evolution API containerizada e rodando | Integração WhatsApp | 2 | Não iniciado | — | — |
| 010 | QR Code conectado ao WhatsApp | Integração WhatsApp | 2 | Não iniciado | — | — |
| 011 | Webhook disparando para o Message Store | Integração WhatsApp | 2 | Não iniciado | — | — |
| 012 | Reconexão automática em caso de queda | Integração WhatsApp | 2 | Não iniciado | — | — |
| 013 | Message Store: endpoint POST /webhook | Message Store | 3 | Não iniciado | — | — |
| 014 | Message Store: parser do payload Evolution API (DT-001) | Message Store | 3 | Não iniciado | — | — |
| 015 | Message Store: criptografia AES-256-GCM no SQLite | Message Store | 3 | Não iniciado | — | — |
| 016 | Message Store: descartar fromMe=true e tipos não suportados | Message Store | 3 | Não iniciado | — | — |
| 017 | Message Store: endpoint GET /health | Message Store | 3 | Não iniciado | — | — |
| 018 | Message Store: schema SQLite conforme 02-DOMAIN seção 7 | Message Store | 3 | Não iniciado | — | — |
| 019 | Cenários Gherkin 5.1 escritos antes do código | QA | 3 | Não iniciado | — | — |
| 020 | Automação dos cenários Gherkin 5.1 | QA | 4 | Não iniciado | — | — |
| 021 | Cobertura ≥ 80% no Message Store | QA | 4 | Não iniciado | — | — |
| 022 | Processador: leitura de mensagens não processadas do SQLite | Processador | 5 | Não iniciado | — | — |
| 023 | Processador: agrupamento de mensagens por lead | Processador | 5 | Não iniciado | — | — |
| 024 | Processador: chamada ao Gemini com schema correto (DT-002) | Processador | 5 | Não iniciado | — | — |
| 025 | Processador: retry 4x com delay de 30.000ms | Processador | 5 | Não iniciado | — | — |
| 026 | Processador: atualização de cards no Notion | Processador | 5 | Não iniciado | — | — |
| 027 | Processador: não sobrescreve campos com string vazia (RN-004) | Processador | 5 | Não iniciado | — | — |
| 028 | Processador: não regride estágio do lead | Processador | 5 | Não iniciado | — | — |
| 029 | Processador: log de auditoria por operação (RN-007) | Processador | 5 | Não iniciado | — | — |
| 030 | Processador: cron às 02h configurável via BATCH_CRON | Processador | 5 | Não iniciado | — | — |
| 031 | Processador: endpoint POST /run | Processador | 5 | Não iniciado | — | — |
| 032 | Cenários Gherkin 5.2 escritos antes do código | QA | 5 | Não iniciado | — | — |
| 033 | Automação dos cenários Gherkin 5.2 | QA | 6 | Não iniciado | — | — |
| 034 | Testes de integração Processador ↔ Notion | QA | 6 | Não iniciado | — | — |
| 035 | Cobertura ≥ 80% no Processador | QA | 6 | Não iniciado | — | — |
| 036 | Gateway: painel web GET / com botão e área de status | Gateway | 7 | Não iniciado | — | — |
| 037 | Gateway: endpoint POST /trigger | Gateway | 7 | Não iniciado | — | — |
| 038 | Gateway: endpoint GET /status | Gateway | 7 | Não iniciado | — | — |
| 039 | Gateway: controle de acesso por IP | Gateway | 7 | Não iniciado | — | — |
| 040 | Gateway: erro legível quando Processador indisponível | Gateway | 7 | Não iniciado | — | — |
| 041 | Cenários Gherkin 5.3 escritos antes do código | QA | 7 | Não iniciado | — | — |
| 042 | Automação dos cenários Gherkin 5.3 | QA | 7 | Não iniciado | — | — |
| 043 | Cobertura ≥ 80% no Gateway | QA | 7 | Não iniciado | — | — |
| 044 | Testes end-to-end: lead novo → card criado no Notion | QA | 8 | Não iniciado | — | — |
| 045 | Testes end-to-end: lead existente → card atualizado | QA | 8 | Não iniciado | — | — |
| 046 | Testes end-to-end: trigger manual → processamento iniciado | QA | 8 | Não iniciado | — | — |
| 047 | Testes de performance: batch 30 leads em < 5 minutos | QA | 8 | Não iniciado | — | — |
| 048 | Testes de performance: webhook P95 < 200ms | QA | 8 | Não iniciado | — | — |
| 049 | Testes de segurança: checklist OWASP + credenciais | SecOps | 8 | Não iniciado | — | — |
| 050 | Testes de segurança: dados sensíveis criptografados | SecOps | 8 | Não iniciado | — | — |
| 051 | Staging: 7 dias sem falha com dados de teste | QA + CEO | 9 | Não iniciado | — | — |
| 052 | Aprovação de go-live pelo CEO | CEO | 10 | Não iniciado | — | CEO |
| 053 | Go-live: produção com dados reais | DevOps | 10 | Não iniciado | — | CEO |
| 054 | Monitoramento ativo: 7 dias em produção sem falha | DevOps + QA | 10 | Não iniciado | — | CEO |

---

## 2. Log de Decisões e Incidentes

```
## Decisão Técnica DT-001 (resolvida pelo CTO)
Data: 2026-07-15
Contexto: Formato real do payload Evolution API v2 difere do genérico.
          pushName pode ser null (anúncios), remoteJid pode ser @lid.
Decisão: Message Store implementa parser defensivo documentado em 02-DOMAIN seção 8.
Status: Incorporada ao Domain. Sem pendências.

## Decisão Técnica DT-002 (resolvida pelo CTO)
Data: 2026-07-15
Contexto: Gemini Flash-Lite rejeita union types no JSON Schema.
Decisão: Usar apenas tipos simples + description instrucional + responseMimeType json.
Status: Incorporada ao Domain. Sem pendências.

## Decisão Técnica DT-003 (resolvida pelo CTO)
Data: 2026-07-15
Contexto: Notion API v1 compatibilidade com operações necessárias.
Decisão: Confirmado — sem impacto no Domain.
Status: Resolvida. Sem pendências.
```

---

## 3. Suposições Abertas (consolidado de todos os documentos)

| ID | Suposição | Documento de origem | Impacto se errada | Status |
|---|---|---|---|---|
| SUP-001 | Número real do WhatsApp conectado via Evolution API após validação com dados de teste | CHARTER | Ajuste no conector WhatsApp | Aberta |
| SUP-002 | Notion continua sendo o CRM no MVP | CHARTER | Fora do escopo MVP | Aberta |
| SUP-003 | Volume máximo de 30 conversas/dia no MVP | CHARTER | Revisão da arquitetura de batch | Aberta |
| SUP-004 | Painel web sem autenticação — acesso por IP restrito | VISION | Camada de autenticação simples | Confirmada ✓ |
| SUP-005 | Batch padrão às 02h | VISION | Mudança de configuração apenas | Confirmada ✓ |
| SUP-006 | Um único número WhatsApp no MVP | VISION | Message Store com multi-instância | Confirmada ✓ |
| SUP-007 | Formato webhook Evolution API v2 | DOMAIN | Parser do Message Store | Resolvida (DT-001) ✓ |
| SUP-008 | Compatibilidade schema JSON com Gemini | DOMAIN | Schema de saída da IA | Resolvida (DT-002) ✓ |
| SUP-009 | Notion API v1 suporta operações necessárias | DOMAIN | Revisão dos endpoints | Resolvida (DT-003) ✓ |
| SUP-010 | VPS com mínimo 2GB RAM e 20GB disco | BLUEPRINT-A | Upgrade de plano antes Sprint 1 | Aberta |
| SUP-011 | Cucumber.js para automação Gherkin | BLUEPRINT-A | Substituição de biblioteca | Aberta |
| SUP-012 | QA com acesso ao staging para testes | BLUEPRINT-B | Criação de ambiente separado | Aberta |
| SUP-013 | Cenários Gherkin cobrem casos de uso do CEO | BLUEPRINT-B | CEO adiciona cenários de negócio | Aberta |
