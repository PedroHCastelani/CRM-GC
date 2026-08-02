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
