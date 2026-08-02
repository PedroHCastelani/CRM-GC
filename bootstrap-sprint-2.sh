#!/usr/bin/env bash
set -euo pipefail

SPRINT="sprint-2"
BASE="master"
cd "$(git rev-parse --show-toplevel)"

git checkout "$BASE" && git pull origin "$BASE" --no-rebase 2>/dev/null || true
git checkout -B "$SPRINT"

mkdir -p scripts/evolution docs

# ══════════════════════════════════════════════════════════════════════
#  1. Criar instancia + obter QR Code  (itens 009, 010)
# ══════════════════════════════════════════════════════════════════════
cat > scripts/evolution/create-instance.sh <<'FIM'
#!/usr/bin/env bash
set -euo pipefail

# Cria a instancia do WhatsApp na Evolution API e exibe o QR Code.
# Pre-requisito: docker compose up -d evolution-api evolution-db

ENV_FILE="${ENV_FILE:-.env}"
[[ -f "$ENV_FILE" ]] || { echo "[ERRO] $ENV_FILE nao encontrado. Rode: cp .env.example .env"; exit 1; }
set -a; source "$ENV_FILE"; set +a

: "${EVOLUTION_API_KEY:?EVOLUTION_API_KEY vazio no .env}"
API="${EVOLUTION_BASE_URL:-http://localhost:8080}"
INSTANCE="${EVOLUTION_INSTANCE:-crm-gc}"
WEBHOOK="${EVOLUTION_WEBHOOK_URL:-http://message-store:3001/webhook}"

echo "Aguardando Evolution API em $API ..."
for i in $(seq 1 30); do
  curl -sf "$API" -H "apikey: $EVOLUTION_API_KEY" >/dev/null 2>&1 && break
  [[ $i -eq 30 ]] && { echo "[ERRO] Evolution API nao respondeu."; exit 1; }
  sleep 2
done
echo "Evolution API online."

# Instancia ja existe?
EXISTE=$(curl -s "$API/instance/fetchInstances" -H "apikey: $EVOLUTION_API_KEY" \
         | grep -c "\"$INSTANCE\"" || true)

if [[ "$EXISTE" -gt 0 ]]; then
  echo "Instancia '$INSTANCE' ja existe. Buscando QR Code..."
  RESP=$(curl -s "$API/instance/connect/$INSTANCE" -H "apikey: $EVOLUTION_API_KEY")
else
  echo "Criando instancia '$INSTANCE'..."
  RESP=$(curl -s -X POST "$API/instance/create" \
    -H "apikey: $EVOLUTION_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"instanceName\": \"$INSTANCE\",
      \"integration\": \"WHATSAPP-BAILEYS\",
      \"qrcode\": true,
      \"rejectCall\": true,
      \"msgCall\": \"\",
      \"groupsIgnore\": true,
      \"alwaysOnline\": false,
      \"readMessages\": false,
      \"readStatus\": false,
      \"syncFullHistory\": false,
      \"webhook\": {
        \"url\": \"$WEBHOOK\",
        \"byEvents\": false,
        \"base64\": false,
        \"events\": [\"MESSAGES_UPSERT\", \"CONNECTION_UPDATE\"]
      }
    }")
fi

# Renderiza o QR no terminal se qrencode existir; senao salva PNG
CODE=$(echo "$RESP" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4 || true)

if [[ -n "$CODE" ]]; then
  echo ""
  if command -v qrencode >/dev/null 2>&1; then
    qrencode -t ANSIUTF8 "$CODE"
  else
    echo "$CODE" > qrcode.txt
    echo "[AVISO] qrencode nao instalado (apt install qrencode)."
    echo "Codigo salvo em qrcode.txt - gere o QR em qualquer leitor."
  fi
  echo ""
  echo "H-06: WhatsApp > Aparelhos conectados > Conectar aparelho > escaneie."
  echo "Depois valide com: ./scripts/evolution/status.sh"
else
  echo "$RESP"
  echo ""
  echo "Sem QR no retorno - instancia pode ja estar conectada."
  echo "Valide com: ./scripts/evolution/status.sh"
fi
FIM

# ══════════════════════════════════════════════════════════════════════
#  2. Configurar / reconfigurar webhook  (item 011)
# ══════════════════════════════════════════════════════════════════════
cat > scripts/evolution/set-webhook.sh <<'FIM'
#!/usr/bin/env bash
set -euo pipefail

# Aponta o webhook da instancia para o Message Store (item 011).
# Idempotente - pode rodar quantas vezes quiser.

ENV_FILE="${ENV_FILE:-.env}"
set -a; source "$ENV_FILE"; set +a

: "${EVOLUTION_API_KEY:?EVOLUTION_API_KEY vazio no .env}"
API="${EVOLUTION_BASE_URL:-http://localhost:8080}"
INSTANCE="${EVOLUTION_INSTANCE:-crm-gc}"
WEBHOOK="${EVOLUTION_WEBHOOK_URL:-http://message-store:3001/webhook}"

echo "Configurando webhook: $WEBHOOK"

RESP=$(curl -s -X POST "$API/webhook/set/$INSTANCE" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"webhook\": {
      \"enabled\": true,
      \"url\": \"$WEBHOOK\",
      \"byEvents\": false,
      \"base64\": false,
      \"events\": [\"MESSAGES_UPSERT\", \"CONNECTION_UPDATE\"]
    }
  }")

echo "$RESP"
echo ""
echo "Verificando..."
curl -s "$API/webhook/find/$INSTANCE" -H "apikey: $EVOLUTION_API_KEY"
echo ""
FIM

# ══════════════════════════════════════════════════════════════════════
#  3. Status da conexao
# ══════════════════════════════════════════════════════════════════════
cat > scripts/evolution/status.sh <<'FIM'
#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env}"
set -a; source "$ENV_FILE"; set +a

API="${EVOLUTION_BASE_URL:-http://localhost:8080}"
INSTANCE="${EVOLUTION_INSTANCE:-crm-gc}"

RESP=$(curl -s "$API/instance/connectionState/$INSTANCE" -H "apikey: $EVOLUTION_API_KEY")
ESTADO=$(echo "$RESP" | grep -o '"state":"[^"]*"' | cut -d'"' -f4 || echo "desconhecido")

echo "Instancia : $INSTANCE"
echo "Estado    : $ESTADO"

case "$ESTADO" in
  open)       echo "Status    : CONECTADO - pronto para receber mensagens"; exit 0 ;;
  connecting) echo "Status    : CONECTANDO - escaneie o QR Code"; exit 2 ;;
  close)      echo "Status    : DESCONECTADO - rode create-instance.sh"; exit 3 ;;
  *)          echo "Status    : $RESP"; exit 4 ;;
esac
FIM

# ══════════════════════════════════════════════════════════════════════
#  4. Watchdog de reconexao automatica  (item 012)
# ══════════════════════════════════════════════════════════════════════
cat > scripts/evolution/watchdog.sh <<'FIM'
#!/usr/bin/env bash
set -uo pipefail

# Item 012 - reconexao automatica. Roda via cron a cada 5 minutos:
#   */5 * * * * cd /opt/crm-gc && ./scripts/evolution/watchdog.sh >> /var/log/crmgc-watchdog.log 2>&1

cd "$(dirname "$0")/../.." || exit 1
ENV_FILE="${ENV_FILE:-.env}"
set -a; source "$ENV_FILE"; set +a

API="${EVOLUTION_BASE_URL:-http://localhost:8080}"
INSTANCE="${EVOLUTION_INSTANCE:-crm-gc}"
STAMP="$(date '+%Y-%m-%d %H:%M:%S')"

log() { echo "[$STAMP] $*"; }

RESP=$(curl -s --max-time 10 "$API/instance/connectionState/$INSTANCE" \
       -H "apikey: $EVOLUTION_API_KEY" 2>/dev/null)

if [[ -z "$RESP" ]]; then
  log "ALERTA: Evolution API nao responde. Reiniciando container..."
  docker compose restart evolution-api
  exit 1
fi

ESTADO=$(echo "$RESP" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)

case "$ESTADO" in
  open)
    log "OK - conectado"
    ;;
  connecting)
    log "AVISO: em conexao (aguardando scan do QR Code)"
    ;;
  close)
    log "ALERTA: desconectado. Tentando reconectar..."
    curl -s --max-time 20 "$API/instance/restart/$INSTANCE" \
      -H "apikey: $EVOLUTION_API_KEY" >/dev/null
    sleep 15
    NOVO=$(curl -s "$API/instance/connectionState/$INSTANCE" \
           -H "apikey: $EVOLUTION_API_KEY" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
    if [[ "$NOVO" == "open" ]]; then
      log "Reconexao bem-sucedida"
    else
      log "FALHA: reconexao nao resolveu (estado=$NOVO). Novo QR Code necessario - acao humana H-06."
      exit 2
    fi
    ;;
  *)
    log "ALERTA: estado desconhecido - $RESP"
    exit 3
    ;;
esac
FIM

# ══════════════════════════════════════════════════════════════════════
#  5. Simulador de webhook para testes locais (payload DT-001)
# ══════════════════════════════════════════════════════════════════════
cat > scripts/evolution/simulate-webhook.sh <<'FIM'
#!/usr/bin/env bash
set -euo pipefail

# Envia um payload messages.upsert falso ao Message Store.
# Permite testar a Sprint 3 sem WhatsApp real conectado.
# Uso: ./simulate-webhook.sh [telefone] [nome] "mensagem"

TARGET="${MESSAGE_STORE_URL:-http://localhost:3001}/webhook"
FONE="${1:-5535999998888}"
NOME="${2:-Lead de Teste}"
TEXTO="${3:-Oi, quero saber sobre as aulas para meu filho de 9 anos}"
TS=$(date +%s)

PAYLOAD=$(cat <<PJ
{
  "event": "messages.upsert",
  "instance": "crm-gc",
  "data": {
    "key": {
      "remoteJid": "${FONE}@s.whatsapp.net",
      "fromMe": false,
      "id": "SIM$(date +%s%N | head -c 16)"
    },
    "pushName": "${NOME}",
    "message": { "conversation": "${TEXTO}" },
    "messageType": "conversation",
    "messageTimestamp": ${TS},
    "source": "android"
  },
  "date_time": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "sender": "5535988887777@s.whatsapp.net"
}
PJ
)

echo "POST $TARGET"
echo "$PAYLOAD"
echo ""
curl -s -w "\nHTTP %{http_code} em %{time_total}s\n" \
  -X POST "$TARGET" -H "Content-Type: application/json" -d "$PAYLOAD"
FIM

chmod +x scripts/evolution/*.sh

# ══════════════════════════════════════════════════════════════════════
#  6. Complemento do .env.example
# ══════════════════════════════════════════════════════════════════════
grep -q 'EVOLUTION_INSTANCE' .env.example || cat >> .env.example <<'FIM'

# ─── Evolution API - Sprint 2 ─────────────────────────────
EVOLUTION_BASE_URL=http://localhost:8080
EVOLUTION_INSTANCE=crm-gc
EVOLUTION_WEBHOOK_URL=http://message-store:3001/webhook
MESSAGE_STORE_URL=http://localhost:3001
FIM

# ══════════════════════════════════════════════════════════════════════
#  7. Runbook da Sprint 2
# ══════════════════════════════════════════════════════════════════════
cat > docs/RUNBOOK-WHATSAPP.md <<'FIM'
---
id: CRMGC-RUNBOOK-006
title: Runbook - Integracao WhatsApp (Evolution API)
version: 0.1.0
status: ACTIVE
owner: Agente de Integracao WhatsApp
depends_on: [CRMGC-OPS-003A, CRMGC-DOMAIN-002]
---

# Runbook - Evolution API

## 1. Subir os servicos

    docker compose up -d evolution-db evolution-api
    docker compose logs -f evolution-api

Aguarde a linha indicando servidor ouvindo na porta 8080.

## 2. Conectar o WhatsApp (H-06)

    ./scripts/evolution/create-instance.sh

O QR Code aparece no terminal (requer qrencode: apt install qrencode).
No celular: WhatsApp > Aparelhos conectados > Conectar aparelho.

Validar:

    ./scripts/evolution/status.sh

Estado esperado: open.

## 3. Configurar o webhook (item 011)

Ja e configurado na criacao da instancia. Para reconfigurar:

    ./scripts/evolution/set-webhook.sh

## 4. Reconexao automatica (item 012)

Instalar no crontab da VPS:

    */5 * * * * cd /opt/crm-gc && ./scripts/evolution/watchdog.sh >> /var/log/crmgc-watchdog.log 2>&1

Comportamento:
- Estado open: apenas registra OK
- API sem resposta: reinicia o container evolution-api
- Estado close: chama /instance/restart e revalida
- Falha persistente: exit code 2 e exige novo QR Code (H-06)

## 5. Testar sem WhatsApp real

    ./scripts/evolution/simulate-webhook.sh
    ./scripts/evolution/simulate-webhook.sh 5535911112222 "Maria" "Meu pai tem 72 anos"

Payload identico ao contrato DT-001. Permite validar a Sprint 3
antes de conectar o numero real.

## 6. Seguranca (SecOps)

- Porta 8080 exposta somente em 127.0.0.1 (docker-compose)
- Firewall UFW nao libera 8080
- AUTHENTICATION_API_KEY obrigatoria em toda chamada
- groupsIgnore true: mensagens de grupo descartadas na origem
- readMessages false: nao marca mensagens como lidas (lead nao percebe automacao)
- rejectCall true: chamadas recusadas automaticamente
- syncFullHistory false: nao importa historico antigo (minimiza dados sensiveis)

## 7. Problemas comuns

| Sintoma | Causa provavel | Acao |
|---|---|---|
| QR Code nao aparece | Container ainda subindo | Aguardar 30s e repetir |
| Estado fica em connecting | QR expirou (validade ~60s) | Rodar create-instance.sh de novo |
| Webhook nao chega | Message Store fora do ar (Sprint 3) | docker compose ps message-store |
| Desconecta com frequencia | Celular sem internet ou WhatsApp Web aberto em outro lugar | Fechar outras sessoes |
| Erro 401 nas chamadas | EVOLUTION_API_KEY divergente | Conferir .env |

## 8. Nota sobre o contrato DT-001

O parser do Message Store (Sprint 3) deve tratar:
- data.key.fromMe true: descartar (nao e mensagem de lead)
- remoteJid com sufixo @s.whatsapp.net ou @lid: extrair somente o numero
- pushName null (leads vindos de anuncio FB/Instagram): gravar string vazia
- messageType diferente de conversation: descartar com log
FIM

# ══════════════════════════════════════════════════════════════════════
#  8. Board atualizado
# ══════════════════════════════════════════════════════════════════════
cat > docs/BOARD.md <<'FIM'
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
FIM

# ══════════════════════════════════════════════════════════════════════
#  9. Commit, push, merge
# ══════════════════════════════════════════════════════════════════════
echo ""
echo "Arquivos da Sprint 2:"
for f in scripts/evolution/create-instance.sh scripts/evolution/set-webhook.sh \
         scripts/evolution/status.sh scripts/evolution/watchdog.sh \
         scripts/evolution/simulate-webhook.sh docs/RUNBOOK-WHATSAPP.md docs/BOARD.md; do
  [[ -f "$f" ]] && echo "  OK    $f" || echo "  FALTA $f"
done
echo ""

git add -A
git diff --cached --quiet && echo "Nada novo." || \
  git commit -m "feat(sprint-2): Evolution API, webhook, watchdog de reconexao e runbook"

git push -u origin "$SPRINT"
git checkout "$BASE"
git pull origin "$BASE" --no-rebase 2>/dev/null || true
git merge --no-ff "$SPRINT" -m "merge($SPRINT): integra Evolution API na $BASE"
git push origin "$BASE"

echo ""
echo "===================================================="
echo " Sprint 2 concluida - branch $SPRINT mergeada em $BASE"
echo "===================================================="
echo ""
echo "COMO VALIDAR:"
echo "  1. docker compose up -d evolution-db evolution-api"
echo "  2. ./scripts/evolution/create-instance.sh"
echo "  3. escanear o QR Code (H-06)"
echo "  4. ./scripts/evolution/status.sh    -> esperado: open"
