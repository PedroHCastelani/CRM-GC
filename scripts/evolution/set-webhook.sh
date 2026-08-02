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
