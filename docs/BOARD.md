---
id: CRMGC-BOARD-005
title: Board de Gerenciamento - CRM GC
version: 0.4.0
status: ACTIVE
owner: CTO
---

# CRM GC - Board de Desenvolvimento

## Estado Atual

| Campo | Valor |
|---|---|
| Sprint ativa | 2 - Integracao WhatsApp |
| Itens com artefato | 16 / 58 |
| Itens validados | 0 / 58 |
| Bloqueio critico | H-02 (VPS) e H-06 (QR Code) |
| Proxima entrega | Sprint 3 - Message Store completo |

## Sprint 1 - Infraestrutura (artefatos entregues)

| # | Item | Status |
|---|---|---|
| 001 | VPS provisionada com Docker | Script pronto -> H-02 |
| 002 | Docker Compose com todos os servicos | Artefato gerado |
| 003 | Variaveis de ambiente, zero hardcode | Artefato gerado |
| 004 | Pipeline CI/CD esqueleto | Artefato gerado |
| 005 | Pipeline bloqueia merge se testes falham | Artefato gerado |
| 006 | Pipeline bloqueia merge se cobertura < 80% | Artefato gerado |
| 007 | Backup automatico do SQLite | Artefato gerado |
| 008 | TLS 1.3 em conexoes externas | Bloqueado por 001 |
| 055 | Board de gestao (DT-004) | Artefato gerado |
| 056 | Script de sincronizacao | Artefato gerado |
| 057 | Script de hardening da VPS | Artefato gerado |

## Sprint 2 - Integracao WhatsApp (ATUAL)

| # | Item | Agente | Status |
|---|---|---|---|
| 009 | Evolution API containerizada e rodando | Integracao WhatsApp | Artefato gerado |
| 010 | QR Code conectado ao WhatsApp | Integracao WhatsApp | Script pronto -> H-06 |
| 011 | Webhook disparando para o Message Store | Integracao WhatsApp | Artefato gerado |
| 012 | Reconexao automatica em caso de queda | Integracao WhatsApp | Artefato gerado |
| 058 | Runbook de operacao do WhatsApp | Integracao WhatsApp | Artefato gerado |
| 059 | Simulador de webhook para testes (DT-001) | QA | Artefato gerado |

## Sprint 3 - Message Store (PROXIMA)

Itens 013 a 019 da matriz de rastreabilidade.

## Backlog

Itens 020-054 + 024-B + 031-B.

## Acoes Humanas Pendentes

| # | Acao | Bloqueia |
|---|---|---|
| H-01 | Repositorio GitHub criado | FEITO |
| H-02 | Provisionar VPS + scripts/setup-vps.sh | 001, 008, deploy |
| H-03 | API Key Gemini (aistudio.google.com) | Sprint 5 |
| H-04 | Notion Internal Integration + compartilhar bancos | Sprint 5 |
| H-05 | Gerar ENCRYPTION_KEY (openssl rand -hex 32) | Sprint 3 |
| H-06 | Escanear QR Code (create-instance.sh) | Item 010 |
| H-07 | GitHub Environments > production > Required reviewers | Item 052 |

## Decisoes Tecnicas Registradas

| ID | Assunto | Status |
|---|---|---|
| DT-001 | Payload real Evolution API v2 | Incorporada |
| DT-002 | Gemini rejeita union types no JSON Schema | Incorporada |
| DT-003 | Notion API v1 compativel | Resolvida |
| DT-004 | Board em Markdown no lugar do Notion | Incorporada |
| DT-005 | Processador expoe GET /status | Incorporada |
| DT-006 | Interface AIProvider com adapters | Incorporada |
| DT-007 | Instancia Evolution com groupsIgnore e readMessages false | Incorporada |
