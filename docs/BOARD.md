---
id: CRMGC-BOARD-005
title: Board de Gerenciamento - CRM GC
version: 0.3.0
status: ACTIVE
owner: CTO
---

# CRM GC - Board de Desenvolvimento

## Estado Atual

| Campo | Valor |
|---|---|
| Sprint ativa | 1 - Infraestrutura |
| Itens com artefato | 11 / 57 |
| Itens validados | 0 / 57 |
| Proxima entrega | Sprint 2 + 3: Evolution API + Message Store |

## Sprint 1 - Infraestrutura

| # | Item | Agente | Status |
|---|---|---|---|
| 001 | VPS provisionada com Docker | Infraestrutura | Script pronto -> H-02 |
| 002 | Docker Compose com todos os servicos | Infraestrutura | Artefato gerado |
| 003 | Variaveis de ambiente, zero hardcode | SecOps | Artefato gerado |
| 004 | Pipeline CI/CD esqueleto | DevOps | Artefato gerado |
| 005 | Pipeline bloqueia merge se testes falham | DevOps | Artefato gerado |
| 006 | Pipeline bloqueia merge se cobertura < 80% | DevOps | Artefato gerado |
| 007 | Backup automatico do SQLite | Infraestrutura | Artefato gerado |
| 008 | TLS 1.3 em conexoes externas | SecOps | Bloqueado por 001 |
| 055 | Board de gestao (DT-004) | CTO | Artefato gerado |
| 056 | Script de sincronizacao | DevOps | Artefato gerado |
| 057 | Script de hardening da VPS | Infraestrutura | Artefato gerado |

## Backlog

Itens 009-054 + 024-B + 031-B da matriz de rastreabilidade (04-TRACEABILITY.md).

## Acoes Humanas Pendentes

| # | Acao | Bloqueia |
|---|---|---|
| H-01 | Repositorio GitHub criado | FEITO |
| H-02 | Provisionar VPS + rodar scripts/setup-vps.sh | 001, 008, Sprint 2 |
| H-03 | API Key Gemini (aistudio.google.com) | Sprint 5 |
| H-04 | Internal Integration Notion + compartilhar bancos | Sprint 5 |
| H-05 | Gerar ENCRYPTION_KEY | Sprint 3 |
| H-06 | Escanear QR Code da Evolution API | Sprint 2 |
| H-07 | GitHub Settings > Environments > production > Required reviewers | Item 052 |
