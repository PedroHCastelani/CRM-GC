---
id: CRMGC-BOARD-005
title: Board de Gerenciamento - CRM GC
version: 0.9.0
status: ACTIVE
owner: CTO
last_update: 2026-08-16
---

# CRM GC - Board de Desenvolvimento

## Estado Atual

| Campo | Valor |
|---|---|
| Sprint ativa | 8 - E2E + Performance + Seguranca |
| Servicos implementados | 3 / 3 (Message Store, Processador, Gateway) |
| Testes totais | 31 (MS) + 41 (Proc) + 17 (GW) = 89 testes passando |
| Cobertura media | ~93% statements, ~83% branches |
| Ultimo merge | PR #2 sprint-7/gateway -> master |
| Proxima entrega | Sprint 8 - Testes E2E, performance e seguranca |

## Sprints Concluidas

| Sprint | Descricao | Status | Testes |
|---|---|---|---|
| 1 | Infraestrutura base, CI/CD, scripts | Concluida | — |
| 2 | Evolution API containerizada | Concluida | — |
| 3 | Message Store (webhook, SQLite, cipher) | Concluida | 31 testes |
| 4 | Testes Message Store (94% coverage) | Concluida | 31 testes |
| 5 | Processador (Gemini, Notion, batch, retry) | Concluida | 41 testes |
| 6 | Testes Processador (94% coverage) | Concluida | 41 testes |
| 7 | Gateway (painel web, /trigger, /status, IP filter) | Concluida | 17 testes |

## Sprint 8 - E2E + Performance + Seguranca (ATUAL)

| # | Item | Agente | Status |
|---|---|---|---|
| 044 | Teste E2E: lead novo -> card criado no Notion | QA | Pendente |
| 045 | Teste E2E: lead existente -> card atualizado | QA | Pendente |
| 046 | Teste E2E: trigger manual -> processamento | QA | Pendente |
| 047 | Performance: batch 30 leads em < 5 min | QA | Pendente |
| 048 | Performance: webhook P95 < 200ms | QA | Pendente |
| 049 | Seguranca: checklist OWASP + credenciais | SecOps | Pendente |
| 050 | Seguranca: dados sensíveis criptografados | SecOps | Pendente |

## Sprints Futuras

Sprint 9: Staging — 7 dias sem falha com dados de teste.
Sprint 10: Go-live com dados reais, monitoramento 7 dias.

## Acoes Humanas Pendentes

| # | Acao | Bloqueia |
|---|---|---|
| H-02 | Provisionar VPS + scripts/setup-vps.sh | deploy |
| H-05 | Gerar ENCRYPTION_KEY no .env local | rodar local |
| H-06 | Escanear QR Code (Evolution API) | teste com WhatsApp real |
| H-07 | GitHub Environments > production > Required reviewers | item 052 |

## Decisoes Tecnicas

| ID | Assunto | Status |
|---|---|---|
| DT-001 | Payload real Evolution API v2 (pushName null, @lid) | Incorporada |
| DT-002 | Gemini schema sem union types + responseMimeType json | Incorporada |
| DT-003 | Notion API v1 suporta todas operacoes necessarias | Incorporada |
| DT-004 | Board em Markdown | Incorporada |
| DT-009 | telefone_hash SHA-256 para UNIQUE sem expor PII | Incorporada |
| DT-010 | Cifra versionada v1 permite rotacao de algoritmo | Incorporada |
| DT-011 | Webhook sempre responde 200 em descarte | Incorporada |
| DT-013 | .nvmrc como fonte unica da versao do Node | Incorporada |
