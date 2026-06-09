#!/usr/bin/env bash
# Быстрый откат billiard.guru на предыдущий релиз (без пересборки).
#   cd ~/billiard.guru/setka && ./scripts/beget-rollback.sh
#   ./scripts/beget-rollback.sh 20250608-120000-abc1234   # конкретный релиз
set -euo pipefail

SITE_ROOT="${SITE_ROOT:-$HOME/billiard.guru}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=beget-lib.sh
source "$REPO_ROOT/scripts/beget-lib.sh"

TARGET="${1:-}"

if [ -n "$TARGET" ]; then
  release_dir="$BEGET_RELEASES/$TARGET"
  if [ ! -f "$release_dir/server.js" ]; then
    echo "Релиз не найден: $release_dir"
    echo ""
    echo "Доступные релизы:"
    beget_list_releases
    exit 1
  fi
  current="$(beget_current_release_dir 2>/dev/null || true)"
  if [ -n "$current" ] && [ -d "$current" ]; then
    ln -sfn "$current" "$BEGET_PREVIOUS"
  fi
  ln -sfn "$release_dir" "$BEGET_CURRENT"
  ln -sfn "$BEGET_CURRENT/public" "$BEGET_PUBLIC_HTML"
  beget_restart_passenger
  echo "✓ current → releases/$TARGET"
else
  beget_rollback_to_previous
fi

echo ""
echo "→ Проверка…"
chmod +x "$REPO_ROOT/scripts/beget-verify.sh"
"$REPO_ROOT/scripts/beget-verify.sh"
