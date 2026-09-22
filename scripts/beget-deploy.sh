#!/usr/bin/env bash
# Обновление prod: то же, что beget-setup.sh (он сам тянет origin/main).
#   cd ~/billiard.guru/setka
#   export PATH="$HOME/.local/bin:$PATH"
#   ./scripts/beget-deploy.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$REPO_ROOT/scripts/beget-setup.sh"
