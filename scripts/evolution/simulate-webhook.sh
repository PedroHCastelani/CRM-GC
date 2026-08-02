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
