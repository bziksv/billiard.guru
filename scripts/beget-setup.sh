#!/usr/bin/env bash
# Развёртывание billiard.guru на Beget (Passenger + Next.js standalone).
# Atomic releases: сборка в .next/standalone, prod — ~/billiard.guru/current.
#
#   cd ~/billiard.guru/setka
#   ./scripts/beget-setup.sh
#   # или: ./scripts/beget-deploy.sh   (git pull + setup)
#
# Пока идёт npm run build, Next.js может удалить .next — сайт продолжает работать
# на предыдущем релизе в ~/billiard.guru/current.
set -euo pipefail

SITE_ROOT="${SITE_ROOT:-$HOME/billiard.guru}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=beget-lib.sh
source "$REPO_ROOT/scripts/beget-lib.sh"

WEB="$BEGET_WEB"
STANDALONE="$BEGET_STANDALONE"
DEPLOY_OK=0

on_deploy_exit() {
  local ec=$?
  if [ "$DEPLOY_OK" = "1" ] || [ "$ec" -eq 0 ]; then
    exit "$ec"
  fi
  echo ""
  echo "⚠ Деплой прерван (код $ec). Live-сайт на предыдущем релизе (~/billiard.guru/current) не тронут."
  echo "  Исправьте ошибку и запустите ./scripts/beget-setup.sh снова."
  exit "$ec"
}

trap on_deploy_exit EXIT

if command -v git >/dev/null && git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if ! git -C "$REPO_ROOT" diff --quiet apps/web/.env.example 2>/dev/null; then
    echo "⚠ Изменён apps/web/.env.example — git pull может быть заблокирован."
    echo "  git stash push apps/web/.env.example   # или: git checkout -- apps/web/.env.example"
    echo ""
  fi
  git -C "$REPO_ROOT" fetch origin main --quiet 2>/dev/null || true
  behind="$(git -C "$REPO_ROOT" rev-list --count HEAD..origin/main 2>/dev/null || echo "")"
  if [ -n "$behind" ] && [ "$behind" != "0" ]; then
    echo "⚠ main отстаёт от origin/main на $behind коммит(ов). Сначала: git pull"
    echo ""
  fi
fi

NODE_BIN="$(beget_find_working_node)" || {
  echo "Node.js не найден или не запускается."
  echo ""
  echo "Сборку запускайте в Docker (там Node уже работал):"
  echo "  ssh localhost -p 222"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo "  node -v"
  echo ""
  echo "Если node -v падает — переустановите:"
  echo "  cd ~/billiard.guru/setka && ./scripts/beget-install-node.sh"
  exit 1
}

dir="$(dirname "$NODE_BIN")"
export PATH="$dir:$PATH"
echo "→ Node: $NODE_BIN ($("$NODE_BIN" -v))"

if [ ! -f "$WEB/.env" ]; then
  echo "Создайте $WEB/.env (скопируйте .env.example, localhost для DATABASE_URL)."
  exit 1
fi

if ! grep -E '^[[:space:]]*DATABASE_URL=.+' "$WEB/.env" | grep -qv '^[[:space:]]*#'; then
  echo "В $WEB/.env нет строки DATABASE_URL=..."
  echo "Сейчас в файле:"
  sed -n '1,8p' "$WEB/.env"
  echo ""
  echo "Пересоздайте файл — см. docs/DEPLOY.md или:"
  echo "  cat > $WEB/.env << 'EOF'"
  echo "  DATABASE_URL=mysql://bziksv_bil:...@localhost:3306/bziksv_bil"
  echo "  ..."
  echo "  EOF"
  exit 1
fi

BEGET_DB_HOST="${BEGET_DB_HOST:-bziksv.beget.tech}"
if grep -qE '@localhost(:3306)?/' "$WEB/.env" 2>/dev/null; then
  echo "→ Beget: localhost недоступен из Passenger, меняем на $BEGET_DB_HOST"
  sed -i "s/@localhost:3306/@${BEGET_DB_HOST}:3306/g; s/@localhost\//@${BEGET_DB_HOST}:3306\//g" "$WEB/.env"
fi

echo "→ Пути prod (.env: SETKA_REPO_ROOT, DB_BACKUP_DIR, UPLOADS_DIR)…"
beget_ensure_prod_env_paths

beget_migrate_legacy_layout

if [ -L "$BEGET_CURRENT" ]; then
  echo "→ Live-релиз: $(basename "$(beget_current_release_dir)")"
else
  echo "→ Первый деплой (current ещё не создан)"
fi

if [ "${BEGET_SKIP_INSTALL:-0}" != "1" ]; then
  echo "→ npm install…"
  cd "$WEB"
  npm install
else
  echo "→ npm install пропущен (BEGET_SKIP_INSTALL=1)"
  cd "$WEB"
fi

echo "→ prisma generate (пропуск на Beget, client в git)…"
if node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)" 2>/dev/null; then
  beget_load_env "$WEB/.env"
  npx prisma generate
else
  echo "  Node $(node -v): используем Prisma client из git (npm run db:generate локально после смены schema)"
fi

echo "→ npm run build (staging: .next/standalone, live не затрагивается)…"
beget_load_env "$WEB/.env"
# Docker на Beget видит все CPU хоста (~55), Next.js по умолчанию поднимает столько же
# worker-процессов; cgroup не даёт столько потоков (tokio: Operation not permitted).
export NEXT_BUILD_CPUS="${NEXT_BUILD_CPUS:-2}"
echo "  NEXT_BUILD_CPUS=$NEXT_BUILD_CPUS"
NODE_ENV=production npm run build:beget

beget_prepare_standalone_staging

echo "→ Node для Passenger (копия в каталог сайта)…"
NODE_SITE="$SITE_ROOT/.node"
NODE_PATH=""

if [[ "$(realpath "$NODE_BIN")" == "$(realpath "$NODE_SITE/bin/node" 2>/dev/null || echo "")" ]]; then
  echo "  Уже используется $NODE_SITE/bin/node"
  NODE_PATH="$(realpath "$NODE_SITE/bin/node")"
elif [ -x "$HOME/.local/bin/node" ] && "$HOME/.local/bin/node" -v >/dev/null 2>&1; then
  NODE_STAGING="$SITE_ROOT/.node.staging"
  rm -rf "$NODE_STAGING"
  mkdir -p "$NODE_STAGING"
  cp -a "$HOME/.local/." "$NODE_STAGING/"
  chmod -R a+rx "$NODE_STAGING"
  rm -rf "${NODE_SITE}.prev"
  if [ -d "$NODE_SITE" ]; then
    mv "$NODE_SITE" "${NODE_SITE}.prev"
  fi
  mv "$NODE_STAGING" "$NODE_SITE"
  NODE_PATH="$(realpath "$NODE_SITE/bin/node")"
  echo "  Обновлён $NODE_PATH"
else
  echo "  Не удалось обновить Node, используем $NODE_BIN"
  NODE_PATH="$(realpath "$NODE_BIN")"
fi

beget_ensure_htaccess "$NODE_PATH"
echo "→ .htaccess: PassengerAppRoot → $BEGET_CURRENT (стабильный путь)"

if [ -e "$SITE_ROOT/public_html" ] && [ ! -L "$SITE_ROOT/public_html" ]; then
  echo "  public_html — каталог, не symlink. Переименуем в public_html.bak"
  mv "$SITE_ROOT/public_html" "$SITE_ROOT/public_html.bak.$(date +%s)"
fi

beget_promote_staging_to_release
beget_restart_passenger
beget_prune_old_releases

beget_load_env "$WEB/.env"
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  WEBHOOK_URL="${TELEGRAM_WEBHOOK_URL:-${APP_URL%/}/api/telegram/webhook}"
  if [[ "$WEBHOOK_URL" == http://* ]] || [[ "$WEBHOOK_URL" == https://* ]]; then
    echo "→ Telegram webhook → $WEBHOOK_URL"
    WH_PARAMS="url=${WEBHOOK_URL}"
    if [ -n "${TELEGRAM_WEBHOOK_SECRET:-}" ]; then
      WH_PARAMS="${WH_PARAMS}&secret_token=${TELEGRAM_WEBHOOK_SECRET}"
    fi
    curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?${WH_PARAMS}" \
      | grep -q '"ok":true' \
      && echo "  ✓ webhook установлен" \
      || echo "  ⚠ не удалось установить webhook (проверьте TELEGRAM_BOT_TOKEN)"
    curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands" \
      -H "Content-Type: application/json" \
      -d '{"commands":[{"command":"start","description":"Начало работы"},{"command":"profile","description":"Мой профиль"},{"command":"tournaments","description":"Мои турниры"},{"command":"bookings","description":"Мои брони"},{"command":"book","description":"Забронировать стол"},{"command":"pokatat","description":"Покатать"},{"command":"club_pokatat","description":"Покатать (клуб)"},{"command":"notifications","description":"Уведомления"}]}' \
      | grep -q '"ok":true' \
      && echo "  ✓ команды бота (/start, /profile, …)" \
      || echo "  ⚠ не удалось обновить команды бота"
  fi
fi

echo ""
echo "→ Health-check после переключения релиза…"
CHECK_URL="${APP_URL:-https://billiard.guru}"
if http_code="$(beget_health_check_url "$CHECK_URL")"; then
  echo "  ✓ HTTP $http_code"
else
  echo "  ✗ HTTP ${http_code:-000} после ${BEGET_HEALTH_RETRIES} попыток"
  if beget_rollback_to_previous; then
    echo "→ Повторная проверка после отката…"
    if rollback_code="$(beget_health_check_url "$CHECK_URL" 5 3)"; then
      echo "  ✓ После отката: HTTP $rollback_code"
    else
      echo "  ✗ После отката всё ещё HTTP ${rollback_code:-000}"
    fi
  fi
  echo ""
  echo "Диагностика: ./scripts/beget-diagnose.sh"
  exit 1
fi

DEPLOY_OK=1

echo ""
echo "→ Финальная проверка (beget-verify.sh)…"
chmod +x "$REPO_ROOT/scripts/beget-verify.sh"
if ! "$REPO_ROOT/scripts/beget-verify.sh"; then
  echo ""
  echo "Проверка не пройдена. Откат: ./scripts/beget-rollback.sh"
  echo "Диагностика: ./scripts/beget-diagnose.sh"
  exit 1
fi

echo ""
echo "Готово. Сайт: $SITE_ROOT"
echo "Live: $BEGET_CURRENT → $(beget_current_release_dir)"
echo "Перезапуск: touch $BEGET_CURRENT/tmp/restart.txt"
echo "Откат: ./scripts/beget-rollback.sh"
echo ""
echo "Релизы:"
beget_list_releases
