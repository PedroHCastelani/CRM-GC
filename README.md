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
