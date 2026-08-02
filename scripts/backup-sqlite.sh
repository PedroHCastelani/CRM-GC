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
