#!/usr/bin/env bash
# Автобэкап БД: вызывает API приложения (настройки в /admin/db-backups).
# Cron (Beget):
#   */5 * * * * /bin/bash /home/b/bziksv/billiard.guru/setka/scripts/db-backup-cron.sh >> ~/db-backup-cron.log 2>&1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"

# Читает KEY=value из .env (export, пробелы, кавычки).
read_env_var() {
  local file="$1"
  local key="$2"
  [ -f "$file" ] || return 1
  local line
  line="$(grep -E "^(export[[:space:]]+)?${key}=" "$file" 2>/dev/null | tail -1 || true)"
  [ -n "$line" ] || return 1
  line="${line#export }"
  line="${line#"${line%%[! ]*}"}"
  line="${line#${key}=}"
  line="${line%$'\r'}"
  line="${line#\"}"
  line="${line%\"}"
  line="${line#\'}"
  line="${line%\'}"
  printf '%s' "$line"
}

ENV_CANDIDATES=(
  "$WEB/.env"
  "$WEB/.next/standalone/.env"
)

SECRET=""
BASE_URL=""

for env_file in "${ENV_CANDIDATES[@]}"; do
  if [ -z "$SECRET" ]; then
    SECRET="$(read_env_var "$env_file" DB_BACKUP_CRON_SECRET || true)"
  fi
  if [ -z "$BASE_URL" ]; then
    BASE_URL="$(read_env_var "$env_file" APP_URL || true)"
  fi
  if [ -z "$BASE_URL" ]; then
    BASE_URL="$(read_env_var "$env_file" NEXT_PUBLIC_APP_URL || true)"
  fi
done

BASE_URL="${BASE_URL:-https://billiard.guru}"

if [ -z "$SECRET" ]; then
  checked=$(printf '%s, ' "${ENV_CANDIDATES[@]}")
  checked="${checked%, }"
  echo "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z') SKIP: DB_BACKUP_CRON_SECRET не найден. Проверьте строку без # в начале: DB_BACKUP_CRON_SECRET=... в одном из: ${checked}"
  exit 0
fi

URL="${BASE_URL%/}/api/admin/db-backups/cron"
HTTP_CODE=$(curl -sS -o /tmp/db-backup-cron-response.$$ -w '%{http_code}' -X POST \
  -H "X-Db-Backup-Cron-Secret: $SECRET" \
  "$URL") || {
  echo "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z') ERROR: curl failed for $URL"
  rm -f /tmp/db-backup-cron-response.$$
  exit 1
}

BODY=$(cat /tmp/db-backup-cron-response.$$)
rm -f /tmp/db-backup-cron-response.$$
echo "$(date -Iseconds 2>/dev/null || date '+%Y-%m-%dT%H:%M:%S%z') HTTP $HTTP_CODE: $BODY"

if [ "$HTTP_CODE" -ge 400 ] 2>/dev/null; then
  exit 1
fi
