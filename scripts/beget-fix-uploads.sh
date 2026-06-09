#!/usr/bin/env bash
# Собрать uploads в shared/ и symlink в current (без пересборки).
#   cd ~/billiard.guru/setka && ./scripts/beget-fix-uploads.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=beget-lib.sh
source "$REPO_ROOT/scripts/beget-lib.sh"

beget_migrate_uploads_to_shared

if [ -L "$BEGET_CURRENT" ] && [ -d "$(beget_current_release_dir)/public" ]; then
  beget_link_uploads_in_public "$(beget_current_release_dir)/public"
  beget_restart_passenger
  echo "✓ current/public/uploads → $BEGET_SHARED_UPLOADS"
else
  echo "⚠ Нет current release — запустите ./scripts/beget-setup.sh"
  exit 1
fi
