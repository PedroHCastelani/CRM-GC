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
