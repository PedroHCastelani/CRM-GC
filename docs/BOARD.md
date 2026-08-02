---
id: CRMGC-BOARD-005
title: Board de Gerenciamento - CRM GC
version: 0.6.0
status: ACTIVE
owner: CTO
---

# CRM GC - Board de Desenvolvimento

## Estado Atual

| Campo | Valor |
|---|---|
| Sprint ativa | 3 - Message Store |
| Itens com artefato | 24 / 60 |
| Cobertura de testes | 4 suites, 60+ assercoes |
| Bloqueio critico | H-05 (ENCRYPTION_KEY) para rodar local |
| Proxima entrega | Sprint 5 - Processador + IA + Notion |

## Sprint 3 - Message Store (ATUAL)

| # | Item | Agente | Status |
|---|---|---|---|
| 013 | POST /webhook recebe payload da Evolution | Message Store | Artefato gerado |
| 014 | Parser defensivo do contrato DT-001 | Message Store | Artefato gerado |
| 015 | Lead criado ou reaproveitado por telefone | Message Store | Artefato gerado |
| 016 | Idempotencia por external_id | Message Store | Artefato gerado |
| 017 | Criptografia AES-256-GCM em repouso (RN-005) | SecOps | Artefato gerado |
| 018 | Configuracao 100% por variavel de ambiente | SecOps | Artefato gerado |
| 019 | GET /health com verificacao real do banco | Message Store | Artefato gerado |
| 065 | Schema SQLite conforme 02-DOMAIN secao 7 | Message Store | Artefato gerado |
| 066 | Auditoria de descartes (webhook_descartes) | QA | Artefato gerado |
| 067 | Logger com redacao de PII (LGPD) | SecOps | Artefato gerado |
| 068 | 11 cenarios Gherkin da secao 5.1 | QA | Artefato gerado |
| 069 | Dockerfile multi-stage, usuario nao-root | Infraestrutura | Artefato gerado |
| 070 | GET /leads/:id/conversa para o Processador | Message Store | Artefato gerado |

## Sprints anteriores

Sprint 1 (infraestrutura) e Sprint 2 (Evolution API): artefatos entregues.
Incidente #001 (pipeline): resolvido.

## Backlog

Sprint 5-6: Processador, IA e Notion - itens 020-035 + 024-B + 031-B.
Sprint 7: Gateway - itens 036-043.
Sprint 8-10: E2E, performance, seguranca, go-live - itens 044-054.

## Acoes Humanas Pendentes

| # | Acao | Bloqueia |
|---|---|---|
| H-02 | Provisionar VPS + scripts/setup-vps.sh | deploy |
| H-03 | API Key Gemini | Sprint 5 |
| H-04 | Notion Internal Integration | Sprint 5 |
| H-05 | Gerar ENCRYPTION_KEY no .env | rodar local |
| H-06 | Escanear QR Code | teste com WhatsApp real |
| H-07 | GitHub Environments > production > Required reviewers | item 052 |

## Decisoes Tecnicas

| ID | Assunto | Status |
|---|---|---|
| DT-001 | Payload real Evolution API v2 | Incorporada |
| DT-004 | Board em Markdown | Incorporada |
| DT-005 | Processador expoe GET /status | Incorporada |
| DT-006 | Interface AIProvider com adapters | Incorporada |
| DT-007 | groupsIgnore e readMessages false | Incorporada |
| DT-008 | CI descobre servicos dinamicamente | Incorporada |
| DT-009 | telefone_hash SHA-256 para UNIQUE sem expor PII | Incorporada |
| DT-010 | Cifra versionada v1 permite rotacao de algoritmo | Incorporada |
| DT-011 | Webhook sempre responde 200 em descarte (evita retry infinito) | Incorporada |
