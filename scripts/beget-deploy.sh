#!/usr/bin/env bash
# Обновление prod: git pull + atomic deploy (beget-setup.sh).
#   cd ~/billiard.guru/setka && ./scripts/beget-deploy.sh
#
# Пока идёт сборка, live-трафик обслуживает ~/billiard.guru/current (предыдущий релиз).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if command -v git >/dev/null && git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "→ git pull…"
  git -C "$REPO_ROOT" pull --ff-only
fi

exec "$REPO_ROOT/scripts/beget-setup.sh"
