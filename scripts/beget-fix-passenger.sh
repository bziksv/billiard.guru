#!/usr/bin/env bash
# Быстрый патч passenger-start.js в current (без пересборки).
# Полезно после смены bootstrap или если Passenger: Cannot find module 'dotenv'.
#
#   cd ~/billiard.guru/setka && ./scripts/beget-fix-passenger.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=beget-lib.sh
source "$REPO_ROOT/scripts/beget-lib.sh"

dir="$(beget_current_release_dir)" || {
  echo "Нет current release"
  exit 1
}

beget_write_passenger_start "$dir"
beget_restart_passenger

echo "✓ passenger-start.js обновлён в $dir"
echo "→ Проверка…"
"$REPO_ROOT/scripts/beget-verify.sh"
