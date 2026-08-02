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
