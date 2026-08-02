#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════
#  CRM GC — Bootstrap Sprint 1 (Infraestrutura + CI/CD)
#  Uso: chmod +x bootstrap-sprint-1.sh && ./bootstrap-sprint-1.sh
# ═══════════════════════════════════════════════════════════════════════

REPO="https://github.com/PedroHCastelani/CRM-GC.git"
SPRINT="sprint-1"
BASE="master"
DIR="CRM-GC"

# ─── 1. Clonar ou reutilizar ───────────────────────────────────────────
if [[ -d "$DIR/.git" ]]; then
  cd "$DIR" && git checkout "$BASE" && git pull origin "$BASE" || true
else
  git clone "$REPO" "$DIR" 2>/dev/null || { mkdir -p "$DIR"; cd "$DIR"; git init -b "$BASE"; git remote add origin "$REPO"; cd ..; }
  cd "$DIR"
  git rev-parse --verify "$BASE" >/dev/null 2>&1 || git checkout -b "$BASE"
fi

# ─── 2. Criar branch da sprint ─────────────────────────────────────────
git checkout -B "$SPRINT"

mkdir -p docs scripts .github/workflows services/{message-store,processador,gateway} data

# ─── 3. .gitignore ─────────────────────────────────────────────────────
cat > .gitignore <<'EOF'
.env
.env.local
data/
backups/
*.db
*.db-shm
*.db-wal
node_modules/
dist/
coverage/
*.log
.DS_Store
EOF

# ─── 4. .env.example ───────────────────────────────────────────────────
cat > .env.example <<'EOF'
# ─── Ambiente ─────────────────────────────────────────────
NODE_ENV=production
LOG_LEVEL=info

# ─── Segurança (RN-005) — gerar: openssl rand -hex 32 ─────
ENCRYPTION_KEY=

# ─── Evolution API ────────────────────────────────────────
EVOLUTION_SERVER_URL=http://localhost:8080
EVOLUTION_API_KEY=
POSTGRES_PASSWORD=

# ─── IA (Charter: modelo intercambiável) ──────────────────
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash-lite
GEMINI_API_KEY=

# ─── Retry (RN-003) ───────────────────────────────────────
RETRY_MAX_ATTEMPTS=4
RETRY_DELAY_MS=30000

# ─── Notion ───────────────────────────────────────────────
NOTION_TOKEN=
NOTION_DB_LEADS=

# ─── Batch (RN-006) ───────────────────────────────────────
BATCH_CRON=0 2 * * *

# ─── Gateway (SUP-004) ────────────────────────────────────
GATEWAY_BIND=127.0.0.1
ALLOWED_IPS=127.0.0.1,::1
EOF

# ─── 5. docker-compose.yml ─────────────────────────────────────────────
cat > docker-compose.yml <<'EOF'
name: crm-gc

x-node-common: &node-common
  restart: unless-stopped
  networks: [crm-internal]

services:
  evolution-api:
    image: atendai/evolution-api:v2.1.1
    container_name: crmgc-evolution
    restart: unless-stopped
    networks: [crm-internal]
    ports: ["127.0.0.1:8080:8080"]
    environment:
      SERVER_URL: ${EVOLUTION_SERVER_URL}
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}
      DATABASE_ENABLED: "true"
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: postgresql://evolution:${POSTGRES_PASSWORD}@evolution-db:5432/evolution
      WEBHOOK_GLOBAL_ENABLED: "true"
      WEBHOOK_GLOBAL_URL: http://message-store:3001/webhook
      WEBHOOK_GLOBAL_BY_EVENTS: "false"
      WEBHOOK_EVENTS_MESSAGES_UPSERT: "true"
      CONFIG_SESSION_PHONE_CLIENT: CRM-GC
      DEL_INSTANCE: "false"
      LOG_LEVEL: ERROR
    volumes: [evolution_instances:/evolution/instances]
    depends_on:
      evolution-db: { condition: service_healthy }

  evolution-db:
    image: postgres:16-alpine
    container_name: crmgc-evolution-db
    restart: unless-stopped
    networks: [crm-internal]
    environment:
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: evolution
    volumes: [evolution_db:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U evolution"]
      interval: 10s
      timeout: 5s
      retries: 5

  message-store:
    <<: *node-common
    build: ./services/message-store
    container_name: crmgc-message-store
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      TZ: America/Sao_Paulo
      PORT: 3001
      SQLITE_PATH: /data/crm.db
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    volumes: ["./data:/data"]
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3

  processador:
    <<: *node-common
    build: ./services/processador
    container_name: crmgc-processador
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      TZ: America/Sao_Paulo
      PORT: 3002
      SQLITE_PATH: /data/crm.db
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      BATCH_CRON: ${BATCH_CRON:-0 2 * * *}
      AI_PROVIDER: ${AI_PROVIDER:-gemini}
      AI_MODEL: ${AI_MODEL:-gemini-2.5-flash-lite}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      NOTION_TOKEN: ${NOTION_TOKEN}
      NOTION_DB_LEADS: ${NOTION_DB_LEADS}
      RETRY_MAX_ATTEMPTS: ${RETRY_MAX_ATTEMPTS:-4}
      RETRY_DELAY_MS: ${RETRY_DELAY_MS:-30000}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    volumes: ["./data:/data"]
    depends_on:
      message-store: { condition: service_healthy }

  gateway:
    <<: *node-common
    build: ./services/gateway
    container_name: crmgc-gateway
    ports: ["${GATEWAY_BIND:-127.0.0.1}:3000:3000"]
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      TZ: America/Sao_Paulo
      PORT: 3000
      PROCESSADOR_URL: http://processador:3002
      MESSAGE_STORE_URL: http://message-store:3001
      ALLOWED_IPS: ${ALLOWED_IPS}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    depends_on: [processador]

networks:
  crm-internal: { driver: bridge }

volumes:
  evolution_instances:
  evolution_db:
EOF

# ─── 6. CI/CD ──────────────────────────────────────────────────────────
cat > .github/workflows/ci.yml <<'EOF'
name: CI

on:
  pull_request:
    branches: [master]
  push:
    branches: [master]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  secrets-scan:
    name: Varredura de credenciais
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified

  test:
    name: Testes - ${{ matrix.service }}
    runs-on: ubuntu-latest
    needs: secrets-scan
    strategy:
      fail-fast: false
      matrix:
        service: [message-store, processador, gateway]
    defaults:
      run:
        working-directory: services/${{ matrix.service }}
    steps:
      - uses: actions/checkout@v4
      - name: Servico ja implementado?
        id: check
        run: |
          if [ -f package.json ]; then echo "ready=true" >> $GITHUB_OUTPUT
          else echo "ready=false" >> $GITHUB_OUTPUT; echo "Servico ainda nao implementado - skip"; fi
      - uses: actions/setup-node@v4
        if: steps.check.outputs.ready == 'true'
        with: { node-version: '22', cache: npm, cache-dependency-path: 'services/${{ matrix.service }}/package-lock.json' }
      - if: steps.check.outputs.ready == 'true'
        run: npm ci
      - if: steps.check.outputs.ready == 'true'
        run: npm run lint
      - if: steps.check.outputs.ready == 'true'
        run: npm run typecheck
      - name: Testes + cobertura (min. 80%)
        if: steps.check.outputs.ready == 'true'
        run: npm run test:coverage
        env:
          ENCRYPTION_KEY: "0000000000000000000000000000000000000000000000000000000000000000"

  build:
    name: Validar Docker Compose
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: cp .env.example .env && docker compose config -q

  deploy-production:
    name: Deploy producao
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/master'
    environment: production
    steps:
      - run: echo "Aguardando aprovacao do CEO (Required reviewers)"
EOF

# ─── 7. Backup SQLite ──────────────────────────────────────────────────
cat > scripts/backup-sqlite.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
DB_PATH="${SQLITE_PATH:-./data/crm.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
[[ -f "$DB_PATH" ]] || { echo "[ERRO] Banco nao encontrado: $DB_PATH" >&2; exit 1; }
DEST="$BACKUP_DIR/crm-$STAMP.db"
sqlite3 "$DB_PATH" ".backup '$DEST'"
gzip -9 "$DEST"
chmod 600 "$DEST.gz"
find "$BACKUP_DIR" -name 'crm-*.db.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[OK] Backup: $DEST.gz"
EOF

# ─── 8. Setup VPS ──────────────────────────────────────────────────────
cat > scripts/setup-vps.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
# Hardening da VPS - rodar como root em Ubuntu 24.04 LTS
apt update && apt upgrade -y
apt install -y curl git sqlite3 ufw fail2ban unattended-upgrades
timedatectl set-timezone America/Sao_Paulo

id crmgc >/dev/null 2>&1 || adduser --disabled-password --gecos "" crmgc
usermod -aG sudo crmgc
mkdir -p /home/crmgc/.ssh
cp /root/.ssh/authorized_keys /home/crmgc/.ssh/ 2>/dev/null || true
chown -R crmgc:crmgc /home/crmgc/.ssh
chmod 700 /home/crmgc/.ssh; chmod 600 /home/crmgc/.ssh/authorized_keys 2>/dev/null || true

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

command -v docker >/dev/null || curl -fsSL https://get.docker.com | sh
usermod -aG docker crmgc
systemctl enable --now docker

mkdir -p /opt/crm-gc && chown -R crmgc:crmgc /opt/crm-gc

if [[ ! -f /swapfile ]]; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "VPS pronta. Reconecte como: ssh crmgc@$(curl -s ifconfig.me)"
EOF

# ─── 9. Sync ───────────────────────────────────────────────────────────
cat > scripts/sync.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
# Uso: ./scripts/sync.sh <nome-da-branch> "mensagem"
BRANCH="${1:?informe a branch, ex: sprint-2}"
MSG="${2:-chore($BRANCH): sincroniza artefatos [$(date +%F)]}"
BASE="master"
cd "$(git rev-parse --show-toplevel)"

git ls-files --error-unmatch .env >/dev/null 2>&1 && { echo "ABORTADO: .env versionado"; exit 1; }

git checkout -B "$BRANCH"
git add -A
git diff --cached --quiet && { echo "Nada a enviar."; exit 0; }

PAD='(ENCRYPTION_KEY|GEMINI_API_KEY|NOTION_TOKEN|POSTGRES_PASSWORD|EVOLUTION_API_KEY)[[:space:]]*=[[:space:]]*[A-Za-z0-9_/+=-]{12,}'
LEAK=$(git diff --cached -U0 -- ':!*.example' ':!scripts/*' | grep -E "^\+.*$PAD" || true)
[[ -n "$LEAK" ]] && { echo "ABORTADO: credencial detectada"; git reset >/dev/null; exit 1; }

git commit -m "$MSG"
git push -u origin "$BRANCH"
git checkout "$BASE"
git pull origin "$BASE" --no-rebase || true
git merge --no-ff "$BRANCH" -m "merge($BRANCH): integra na $BASE"
git push origin "$BASE"
echo "OK: $BRANCH commitada e mergeada em $BASE"
EOF

chmod +x scripts/*.sh

# ─── 10. Board ─────────────────────────────────────────────────────────
cat > docs/BOARD.md <<'EOF'
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
| H-05 | Gerar ENCRYPTION_KEY (openssl rand -hex 32) | Sprint 3 |
| H-06 | Escanear QR Code da Evolution API | Sprint 2 |
| H-07 | GitHub Settings > Environments > production > Required reviewers | Item 052 |
EOF

# ─── 11. README ────────────────────────────────────────────────────────
cat > README.md <<'EOF'
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

```bash
cp .env.example .env
# preencher ENCRYPTION_KEY, EVOLUTION_API_KEY, POSTGRES_PASSWORD
docker compose up -d
