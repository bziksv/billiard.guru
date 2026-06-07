#!/usr/bin/env bash
# Автобэкап БД: вызывает API приложения (настройки в /admin/db-backups).
# Cron (Beget, раз в час):
#   0 * * * * /home/b/bziksv/billiard.guru/setka/scripts/db-backup-cron.sh >> ~/db-backup-cron.log 2>&1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
ENV_FILE="$WEB/.env"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  source <(grep -E '^(DB_BACKUP_CRON_SECRET|NEXT_PUBLIC_APP_URL|APP_URL)=' "$ENV_FILE" | sed 's/\r$//')
  set +a
fi

BASE_URL="${APP_URL:-${NEXT_PUBLIC_APP_URL:-https://billiard.guru}}"
SECRET="${DB_BACKUP_CRON_SECRET:-}"

if [ -z "$SECRET" ]; then
  echo "$(date -Iseconds) SKIP: DB_BACKUP_CRON_SECRET не задан в apps/web/.env"
  exit 0
fi

curl -sf -X POST \
  -H "X-Db-Backup-Cron-Secret: $SECRET" \
  "${BASE_URL%/}/api/admin/db-backups/cron"

echo ""
