#!/usr/bin/env bash
# Backfill *En fields on prod DB via DeepSeek.
#   cd ~/billiard.guru/setka && ./scripts/beget-backfill-translations.sh
#   cd ~/billiard.guru/setka && ./scripts/beget-backfill-translations.sh --count
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$REPO_ROOT/apps/web"

if [[ ! -f "$WEB/.env" ]]; then
  echo "Нет $WEB/.env — задайте DEEPSEEK_API_KEY" >&2
  exit 1
fi

if ! grep -qE '^DEEPSEEK_API_KEY=.+' "$WEB/.env"; then
  echo "DEEPSEEK_API_KEY пуст в $WEB/.env" >&2
  exit 1
fi

cd "$WEB"
export PATH="${HOME}/.local/bin:${PATH:-}"

echo "→ npm run i18n:backfill:count"
npm run i18n:backfill:count

if [[ "${1:-}" == "--count" ]]; then
  exit 0
fi

echo ""
echo "→ npm run i18n:backfill (может занять несколько минут)"
npm run i18n:backfill
