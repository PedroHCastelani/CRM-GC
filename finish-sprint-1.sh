#!/usr/bin/env bash
set -euo pipefail

SPRINT="sprint-1"
BASE="master"

cd "$(git rev-parse --show-toplevel)"
git checkout "$SPRINT" 2>/dev/null || git checkout -B "$SPRINT"

mkdir -p docs data

# ─── docs/BOARD.md ─────────────────────────────────────────────────────
cat > docs/BOARD.md <<'FIM_BOARD'
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
FIM_BOARD

# ─── README.md (sem backticks para nao quebrar) ────────────────────────
cat > README.md <<'FIM_README'
# CRM GC

CRM automatizado de leads via WhatsApp para a Ginastica do Cerebro.

## Arquitetura

| Servico | Responsabilidade |
|---|---|
| Evolution API | Recebe mensagens do WhatsApp e dispara webhook |
| Message Store | Persiste mensagens no SQLite com AES-256-GCM |
| Processador | Analisa conversas com IA e atualiza cards no Notion |
| Gateway | Painel web minimo + trigger manual |

## Setup local

    cp .env.example .env
    docker compose up -d

Preencher no .env: ENCRYPTION_KEY, EVOLUTION_API_KEY, POSTGRES_PASSWORD.

## Gerar chaves

    openssl rand -hex 32     # ENCRYPTION_KEY
    openssl rand -hex 24     # EVOLUTION_API_KEY
    openssl rand -base64 24  # POSTGRES_PASSWORD

## Scripts

| Script | Uso |
|---|---|
| scripts/setup-vps.sh | Hardening da VPS (rodar como root no Ubuntu 24.04) |
| scripts/backup-sqlite.sh | Backup consistente do SQLite |
| scripts/sync.sh | Ciclo branch, commit, push e merge em master |

Exemplo: ./scripts/sync.sh sprint-2 "feat(sprint-2): Message Store"

## Documentacao

Ver pasta docs/ - Charter, Vision, Domain, Blueprint, Traceability e Board.

## Principios inegociaveis

- A IA nunca envia mensagens a leads
- Dados sensiveis criptografados em repouso e em transito
- Nenhuma condicao de saude inferida
- Nada em producao fora do pipeline CI/CD
FIM_README

touch data/.gitkeep
chmod +x scripts/*.sh 2>/dev/null || true

# ─── Verificacao ───────────────────────────────────────────────────────
echo ""
echo "Arquivos presentes:"
for f in .gitignore .env.example docker-compose.yml README.md \
         .github/workflows/ci.yml docs/BOARD.md \
         scripts/sync.sh scripts/setup-vps.sh scripts/backup-sqlite.sh; do
  [[ -f "$f" ]] && echo "  OK   $f" || echo "  FALTA $f"
done
echo ""

# ─── Commit, push, merge ───────────────────────────────────────────────
git add -A
if git diff --cached --quiet; then
  echo "Nada novo para commitar."
else
  git commit -m "feat(sprint-1): infraestrutura base, CI/CD, backup, board e scripts"
fi

git push -u origin "$SPRINT"

git checkout "$BASE" 2>/dev/null || git checkout -B "$BASE"
git pull origin "$BASE" --no-rebase 2>/dev/null || true
git merge --no-ff "$SPRINT" -m "merge($SPRINT): integra infraestrutura na $BASE"
git push -u origin "$BASE"

echo ""
echo "===================================================="
echo " Sprint 1 concluida"
echo " Branch: $SPRINT  ->  merge em $BASE"
echo " https://github.com/PedroHCastelani/CRM-GC"
echo "===================================================="
