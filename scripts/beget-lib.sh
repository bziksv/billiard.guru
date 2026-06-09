#!/usr/bin/env bash
# Общие функции деплоя billiard.guru на Beget (Passenger + atomic releases).
# Подключение: source "$(dirname "$0")/beget-lib.sh"
#
# Схема: сборка в apps/web/.next/standalone (staging), прод — ~/billiard.guru/current → releases/<id>.
# Пока идёт npm run build, Next.js может удалить .next — live-трафик не затрагивается.

: "${SITE_ROOT:=$HOME/billiard.guru}"
BEGET_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BEGET_REPO_ROOT="$(cd "$BEGET_LIB_DIR/.." && pwd)"
BEGET_WEB="$BEGET_REPO_ROOT/apps/web"
BEGET_STANDALONE="$BEGET_WEB/.next/standalone"
BEGET_RELEASES="$SITE_ROOT/releases"
BEGET_CURRENT="$SITE_ROOT/current"
BEGET_PREVIOUS="$SITE_ROOT/previous"
BEGET_HTACCESS="$SITE_ROOT/.htaccess"
BEGET_PUBLIC_HTML="$SITE_ROOT/public_html"
BEGET_KEEP_RELEASES="${BEGET_KEEP_RELEASES:-5}"
BEGET_HEALTH_RETRIES="${BEGET_HEALTH_RETRIES:-8}"
BEGET_HEALTH_INTERVAL="${BEGET_HEALTH_INTERVAL:-4}"

beget_find_working_node() {
  local candidate
  for candidate in \
    "$SITE_ROOT/.node/bin/node" \
    "$HOME/.local/bin/node" \
    "$(command -v node 2>/dev/null || true)"; do
    [ -n "$candidate" ] && [ -x "$candidate" ] || continue
    if "$candidate" -v >/dev/null 2>&1; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

beget_load_env() {
  local env_file="${1:-$BEGET_WEB/.env}"
  set -a
  # shellcheck disable=SC1090
  . "$env_file"
  set +a
}

beget_release_id() {
  local sha short_sha
  sha="$(git -C "$BEGET_REPO_ROOT" rev-parse --short HEAD 2>/dev/null || echo nogit)"
  short_sha="${sha:0:12}"
  date -u +"%Y%m%d-%H%M%S-${short_sha}" 2>/dev/null || date +"%Y%m%d-%H%M%S-${short_sha}"
}

beget_current_release_dir() {
  if [ -L "$BEGET_CURRENT" ]; then
    readlink -f "$BEGET_CURRENT" 2>/dev/null || readlink "$BEGET_CURRENT"
    return 0
  fi
  return 1
}

BEGET_SHARED="$SITE_ROOT/shared"
BEGET_SHARED_UPLOADS="$SITE_ROOT/shared/uploads"

beget_ensure_shared_uploads() {
  mkdir -p "$BEGET_SHARED_UPLOADS/clubs" "$BEGET_SHARED_UPLOADS/coaches" "$BEGET_SHARED_UPLOADS/players"
  chmod -R a+rx "$BEGET_SHARED" 2>/dev/null || true
}

beget_migrate_uploads_to_shared() {
  beget_ensure_shared_uploads
  local src sub
  local sources=()

  sources+=("$BEGET_WEB/public/uploads")
  sources+=("$BEGET_STANDALONE/public/uploads")

  if [ -L "$BEGET_CURRENT" ]; then
    sources+=("$(beget_current_release_dir)/public/uploads")
  fi

  if [ -d "$BEGET_RELEASES" ]; then
    while IFS= read -r rel; do
      [ -n "$rel" ] || continue
      sources+=("$rel/public/uploads")
    done < <(find "$BEGET_RELEASES" -mindepth 1 -maxdepth 1 -type d 2>/dev/null || true)
  fi

  for src in "${sources[@]}"; do
    [ -e "$src" ] || continue
    if [ -L "$src" ]; then
      continue
    fi
    for sub in clubs coaches players; do
      if [ -d "$src/$sub" ]; then
        mkdir -p "$BEGET_SHARED_UPLOADS/$sub"
        cp -an "$src/$sub/." "$BEGET_SHARED_UPLOADS/$sub/" 2>/dev/null || true
      fi
    done
  done
}

beget_link_uploads_in_public() {
  local public_dir="$1"
  beget_ensure_shared_uploads
  mkdir -p "$public_dir"
  rm -rf "$public_dir/uploads"
  ln -sfn "$BEGET_SHARED_UPLOADS" "$public_dir/uploads"
}

beget_env_set_if_missing() {
  local key="$1"
  local value="$2"
  local file="$BEGET_WEB/.env"
  [ -f "$file" ] || return 0
  if grep -qE "^[[:space:]]*${key}=" "$file" 2>/dev/null; then
    return 0
  fi
  echo "${key}=${value}" >> "$file"
  echo "  ✓ .env: добавлен ${key}"
}

beget_ensure_prod_env_paths() {
  beget_env_set_if_missing "SETKA_REPO_ROOT" "$BEGET_REPO_ROOT"
  beget_env_set_if_missing "DB_BACKUP_DIR" "$BEGET_REPO_ROOT/data/db-backups"
  beget_env_set_if_missing "UPLOADS_DIR" "$BEGET_SHARED_UPLOADS"
}

beget_write_passenger_start() {
  local target_dir="$1"
  # Без require("dotenv"): в releases/ нет доступа к node_modules репозитория.
  cat > "$target_dir/passenger-start.js" << 'EOF'
const path = require("path");
const fs = require("fs");

function loadEnvFile(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("export ")) trimmed = trimmed.slice(7).trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

const dir = __dirname;
loadEnvFile(path.join(dir, ".env"));
loadEnvFile(path.join(dir, ".env.local"));
require("./server.js");
EOF
}

beget_prepare_standalone_staging() {
  local staging="$BEGET_STANDALONE"
  beget_migrate_uploads_to_shared
  echo "→ Копируем static в standalone (staging)…"
  mkdir -p "$staging/.next"
  cp -r "$BEGET_WEB/public" "$staging/public"
  beget_link_uploads_in_public "$staging/public"
  cp -r "$BEGET_WEB/.next/static" "$staging/.next/static"
  cp "$BEGET_WEB/.env" "$staging/.env"
  ln -sfn "$BEGET_WEB/.env" "$staging/.env.local"
  beget_write_passenger_start "$staging"
}

beget_migrate_legacy_layout() {
  if [ -L "$BEGET_CURRENT" ] && [ -f "$(beget_current_release_dir)/server.js" ]; then
    return 0
  fi

  local legacy_src=""
  if [ -f "$BEGET_STANDALONE/server.js" ]; then
    legacy_src="$BEGET_STANDALONE"
  elif [ -f "$SITE_ROOT/.standalone-backup/server.js" ]; then
    legacy_src="$SITE_ROOT/.standalone-backup"
  fi

  if [ -z "$legacy_src" ]; then
    return 0
  fi

  echo "→ Миграция на atomic releases (первый запуск)…"
  local id="legacy-$(date +%Y%m%d-%H%M%S)"
  local dest="$BEGET_RELEASES/$id"
  mkdir -p "$BEGET_RELEASES"
  cp -a "$legacy_src" "$dest"
  beget_write_passenger_start "$dest"
  ln -sfn "$dest" "$BEGET_CURRENT"
  ln -sfn "$dest" "$BEGET_PREVIOUS"
  echo "  ✓ current → releases/$id"
}

beget_promote_staging_to_release() {
  local release_id="${1:-$(beget_release_id)}"
  local release_dir="$BEGET_RELEASES/$release_id"
  local prev=""

  if [ ! -f "$BEGET_STANDALONE/server.js" ]; then
    echo "Ошибка: нет staging standalone ($BEGET_STANDALONE/server.js)"
    return 1
  fi

  mkdir -p "$BEGET_RELEASES"

  if [ -L "$BEGET_CURRENT" ]; then
    prev="$(beget_current_release_dir || true)"
  fi

  echo "→ Релиз $release_id (staging → releases/)…"
  rm -rf "$release_dir"
  cp -a "$BEGET_STANDALONE" "$release_dir"
  beget_write_passenger_start "$release_dir"
  beget_link_uploads_in_public "$release_dir/public"

  local git_sha git_branch
  git_sha="$(git -C "$BEGET_REPO_ROOT" rev-parse HEAD 2>/dev/null || echo null)"
  git_branch="$(git -C "$BEGET_REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo null)"
  cat > "$release_dir/RELEASE.json" << EOF
{"id":"$release_id","gitSha":"$git_sha","gitBranch":"$git_branch","promotedAt":"$(date -Iseconds 2>/dev/null || date)"}
EOF

  if [ -n "$prev" ] && [ -d "$prev" ]; then
    ln -sfn "$prev" "$BEGET_PREVIOUS"
  fi

  ln -sfn "$release_dir" "$BEGET_CURRENT"
  ln -sfn "$BEGET_CURRENT/public" "$BEGET_PUBLIC_HTML"
  mkdir -p "$BEGET_CURRENT/tmp"
  chmod -R a+rx "$release_dir" "$SITE_ROOT/.node" 2>/dev/null || true

  echo "  ✓ current → releases/$release_id"
  if [ -n "$prev" ]; then
    echo "  ✓ previous → $prev"
  fi

  BEGET_LAST_PROMOTED_RELEASE="$release_dir"
  BEGET_LAST_PREVIOUS_RELEASE="$prev"
  export BEGET_LAST_PROMOTED_RELEASE BEGET_LAST_PREVIOUS_RELEASE
}

beget_ensure_htaccess() {
  local node_path="$1"
  local app_root="$BEGET_CURRENT"

  mkdir -p "$SITE_ROOT"
  cat > "$BEGET_HTACCESS" << EOF
PassengerNodejs $node_path
PassengerAppRoot $app_root
PassengerAppType node
PassengerStartupFile passenger-start.js
EOF
  chmod 644 "$BEGET_HTACCESS"
}

beget_restart_passenger() {
  mkdir -p "$BEGET_CURRENT/tmp"
  touch "$BEGET_CURRENT/tmp/restart.txt"
}

beget_rollback_to_previous() {
  local prev=""
  if [ -L "$BEGET_PREVIOUS" ]; then
    prev="$(readlink -f "$BEGET_PREVIOUS" 2>/dev/null || readlink "$BEGET_PREVIOUS")"
  elif [ -n "${BEGET_LAST_PREVIOUS_RELEASE:-}" ] && [ -d "$BEGET_LAST_PREVIOUS_RELEASE" ]; then
    prev="$BEGET_LAST_PREVIOUS_RELEASE"
  fi

  if [ -z "$prev" ] || [ ! -f "$prev/server.js" ]; then
    echo "⚠ Откат невозможен — нет previous release"
    return 1
  fi

  echo "→ Откат current → $prev"
  ln -sfn "$prev" "$BEGET_CURRENT"
  ln -sfn "$BEGET_CURRENT/public" "$BEGET_PUBLIC_HTML"
  beget_restart_passenger
  echo "  ✓ Откат выполнен"
}

beget_prune_old_releases() {
  local keep="${1:-$BEGET_KEEP_RELEASES}"
  local current_target prev_target
  current_target="$(beget_current_release_dir 2>/dev/null || true)"
  prev_target=""
  if [ -L "$BEGET_PREVIOUS" ]; then
    prev_target="$(readlink -f "$BEGET_PREVIOUS" 2>/dev/null || readlink "$BEGET_PREVIOUS")"
  fi

  [ -d "$BEGET_RELEASES" ] || return 0

  local count=0
  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    count=$((count + 1))
    if [ "$count" -le "$keep" ]; then
      continue
    fi
    if [ "$dir" = "$current_target" ] || [ "$dir" = "$prev_target" ]; then
      continue
    fi
    echo "→ Удаляем старый релиз: $(basename "$dir")"
    rm -rf "$dir"
  done < <(find "$BEGET_RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null \
    | sort -rn | awk '{print $2}' \
    || find "$BEGET_RELEASES" -mindepth 1 -maxdepth 1 -type d 2>/dev/null \
    | while read -r d; do stat -f '%m %N' "$d" 2>/dev/null || stat -c '%Y %n' "$d"; done \
    | sort -rn | awk '{print $2}')
}

beget_health_check_url() {
  local url="${1:-}"
  local retries="${2:-$BEGET_HEALTH_RETRIES}"
  local interval="${3:-$BEGET_HEALTH_INTERVAL}"
  local attempt code

  if [ -z "$url" ]; then
    if [ -f "$BEGET_WEB/.env" ]; then
      beget_load_env "$BEGET_WEB/.env"
    fi
    url="${APP_URL:-https://billiard.guru}"
  fi
  url="${url%/}"

  for attempt in $(seq 1 "$retries"); do
    code="$(curl -sS -o /dev/null -w "%{http_code}" -L "$url" --max-time 45 2>/dev/null || echo "000")"
    case "$code" in
      200|301|302|307|308)
        echo "$code"
        return 0
        ;;
    esac
    if [ "$attempt" -lt "$retries" ]; then
      echo "  попытка $attempt/$retries: HTTP $code, ждём ${interval}s…" >&2
      sleep "$interval"
    fi
  done

  echo "${code:-000}"
  return 1
}

beget_list_releases() {
  [ -d "$BEGET_RELEASES" ] || return 0
  find "$BEGET_RELEASES" -mindepth 1 -maxdepth 1 -type d 2>/dev/null \
    | sort -r \
    | while read -r d; do
        local marker=""
        if [ "$(beget_current_release_dir 2>/dev/null || true)" = "$d" ]; then
          marker=" (current)"
        elif [ -L "$BEGET_PREVIOUS" ] && [ "$(readlink -f "$BEGET_PREVIOUS" 2>/dev/null || readlink "$BEGET_PREVIOUS")" = "$d" ]; then
          marker=" (previous)"
        fi
        echo "  $(basename "$d")$marker"
      done
}
