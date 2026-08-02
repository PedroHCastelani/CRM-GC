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
