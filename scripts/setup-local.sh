#!/bin/bash
# =============================================================
# CRM GC — Setup Local (desenvolvimento)
# Execute uma vez antes de rodar docker compose up
# =============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo ""
echo "============================================"
echo "  CRM GC — Setup Local"
echo "============================================"
echo ""

# Verificar pré-requisitos
for cmd in docker openssl; do
  if ! command -v $cmd &>/dev/null; then
    echo -e "${RED}ERRO: $cmd não encontrado.${NC}"; exit 1
  fi
done
docker compose version &>/dev/null || { echo -e "${RED}ERRO: Docker Compose v2 não encontrado.${NC}"; exit 1; }
echo -e "${GREEN}✓ Pré-requisitos OK${NC}"

# Criar .env se não existir
if [ ! -f ".env" ]; then
  cp .env.example .env
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  POSTGRES_PASSWORD=$(openssl rand -hex 16)
  EVOLUTION_API_KEY=$(openssl rand -hex 24)
  sed -i "s/^ENCRYPTION_KEY=$/ENCRYPTION_KEY=${ENCRYPTION_KEY}/" .env
  sed -i "s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=${POSTGRES_PASSWORD}/" .env
  sed -i "s/^EVOLUTION_API_KEY=$/EVOLUTION_API_KEY=${EVOLUTION_API_KEY}/" .env
  echo -e "${GREEN}✓ .env criado com chaves geradas automaticamente${NC}"
else
  echo -e "${YELLOW}! .env já existe — mantido${NC}"
fi

# Verificar variáveis obrigatórias que o usuário precisa preencher
MISSING=0
for VAR in GEMINI_API_KEY NOTION_TOKEN NOTION_DB_LEADS; do
  VALUE=$(grep "^${VAR}=" .env | cut -d'=' -f2)
  if [ -z "$VALUE" ] || echo "$VALUE" | grep -q "PREENCHER"; then
    echo -e "${RED}  ✗ ${VAR} não preenchida${NC}"
    MISSING=$((MISSING + 1))
  else
    echo -e "${GREEN}  ✓ ${VAR}${NC}"
  fi
done

if [ $MISSING -gt 0 ]; then
  echo ""
  echo -e "${RED}Preencha as variáveis acima no .env antes de continuar.${NC}"
  echo ""
  echo "  GEMINI_API_KEY  → https://aistudio.google.com/apikey"
  echo "  NOTION_TOKEN    → Notion > Settings > Integrations"
  echo "  NOTION_DB_LEADS → ID do banco Leads no Notion"
  echo ""
  exit 1
fi

# Criar pasta de dados
mkdir -p data
echo -e "${GREEN}✓ Pasta ./data criada${NC}"

echo ""
echo -e "${GREEN}============================================"
echo "  Tudo pronto! Execute:"
echo "  docker compose up -d"
echo "  docker compose logs -f"
echo "============================================${NC}"
echo ""
