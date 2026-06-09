#!/usr/bin/env bash
# Собрать SQL-бэкапы из releases/current в setka/data/db-backups.
#   cd ~/billiard.guru/setka && ./scripts/beget-migrate-db-backups.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=beget-lib.sh
source "$REPO_ROOT/scripts/beget-lib.sh"

CANON="$BEGET_REPO_ROOT/data/db-backups"
mkdir -p "$CANON"

copied=0
while IFS= read -r dir; do
  [ -n "$dir" ] || continue
  [ "$dir" = "$CANON" ] && continue
  for f in "$dir"/*.sql "$dir"/*.sql.gz; do
    [ -f "$f" ] || continue
    base="$(basename "$f")"
    if [ ! -f "$CANON/$base" ]; then
      cp -a "$f" "$CANON/$base"
      copied=$((copied + 1))
      echo "  + $base  ← $dir"
    fi
  done
done < <(
  find "$SITE_ROOT/releases" "$BEGET_STANDALONE" "$BEGET_REPO_ROOT/apps/web/.next" \
    -type d -name db-backups 2>/dev/null | sort -u || true
)

echo "✓ Каталог: $CANON"
echo "  Скопировано файлов: $copied"
echo "  Всего в каталоге: $(find "$CANON" -maxdepth 1 -type f \( -name '*.sql' -o -name '*.sql.gz' \) 2>/dev/null | wc -l | tr -d ' ')"
