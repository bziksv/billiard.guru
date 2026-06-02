#!/usr/bin/env bash
# Развёртывание billiard.guru на Beget (Passenger + Next.js standalone).
# Запускать на сервере в Docker: ssh bziksv@bziksv.beget.tech → ssh localhost -p 222
#
#   cd ~/billiard.guru/setka
#   ./scripts/beget-setup.sh
#
# При падении сборки восстанавливает предыдущий standalone (чтобы не оставить 403).
# В конце — ./scripts/beget-verify.sh (HTTP + symlink + Passenger).
set -euo pipefail

SITE_ROOT="${SITE_ROOT:-$HOME/billiard.guru}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$REPO_ROOT/apps/web"
STANDALONE="$WEB/.next/standalone"
STANDALONE_BACKUP="$SITE_ROOT/.standalone-backup"
DEPLOY_OK=0

restore_standalone_if_failed() {
  local ec=$?
  if [ "$DEPLOY_OK" = "1" ] || [ "$ec" -eq 0 ]; then
    exit "$ec"
  fi
  if [ ! -f "$STANDALONE_BACKUP/server.js" ]; then
    echo ""
    echo "⚠ Сборка упала (код $ec), резервного standalone нет — сайт может отдавать 403."
    echo "  Исправьте ошибку сборки и запустите ./scripts/beget-setup.sh снова."
    exit "$ec"
  fi
  echo ""
  echo "⚠ Сборка упала (код $ec). Восстанавливаем предыдущий standalone (без 403)…"
  rm -rf "$STANDALONE"
  mkdir -p "$(dirname "$STANDALONE")"
  cp -a "$STANDALONE_BACKUP" "$STANDALONE"
  mkdir -p "$STANDALONE/public" "$STANDALONE/.next"
  if [ ! -d "$STANDALONE/.next/static" ] && [ -d "$WEB/.next/static" ]; then
    cp -r "$WEB/.next/static" "$STANDALONE/.next/static" 2>/dev/null || true
  fi
  if [ -f "$WEB/.env" ]; then
    cp "$WEB/.env" "$STANDALONE/.env"
    ln -sfn "$WEB/.env" "$STANDALONE/.env.local"
  fi
  ln -sfn "$STANDALONE/public" "$SITE_ROOT/public_html"
  mkdir -p "$STANDALONE/tmp"
  touch "$STANDALONE/tmp/restart.txt"
  echo "  ✓ Откат выполнен. Исправьте ошибку сборки и запустите скрипт снова."
  exit "$ec"
}

trap restore_standalone_if_failed EXIT

backup_current_standalone() {
  if [ ! -f "$STANDALONE/server.js" ]; then
    return 0
  fi
  echo "→ Резервная копия текущего standalone (на случай падения build)…"
  rm -rf "$STANDALONE_BACKUP"
  cp -a "$STANDALONE" "$STANDALONE_BACKUP"
}

find_working_node() {
  local candidate dir
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

NODE_BIN="$(find_working_node)" || {
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

load_env_for_build() {
  set -a
  # shellcheck disable=SC1091
  . "$WEB/.env"
  set +a
}

BEGET_DB_HOST="${BEGET_DB_HOST:-bziksv.beget.tech}"
if grep -qE '@localhost(:3306)?/' "$WEB/.env" 2>/dev/null; then
  echo "→ Beget: localhost недоступен из Passenger, меняем на $BEGET_DB_HOST"
  sed -i "s/@localhost:3306/@${BEGET_DB_HOST}:3306/g; s/@localhost\//@${BEGET_DB_HOST}:3306\//g" "$WEB/.env"
fi

echo "→ npm install…"
cd "$WEB"
npm install

echo "→ prisma generate (пропуск на Beget, client в git)…"
if node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)" 2>/dev/null; then
  load_env_for_build
  npx prisma generate
else
  echo "  Node $(node -v): используем Prisma client из git (npm run db:generate локально после смены schema)"
fi

echo "→ npm run build…"
backup_current_standalone
load_env_for_build
NODE_ENV=production npm run build:beget

echo "→ Копируем static в standalone…"
mkdir -p "$STANDALONE/.next"
cp -r public "$STANDALONE/public"
cp -r .next/static "$STANDALONE/.next/static"
cp "$WEB/.env" "$STANDALONE/.env"
ln -sfn "$WEB/.env" "$STANDALONE/.env.local"

cat > "$STANDALONE/passenger-start.js" << 'EOF'
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("./server.js");
EOF

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
APP_ROOT="$(realpath "$STANDALONE")"

echo "→ .htaccess в $SITE_ROOT…"
mkdir -p "$SITE_ROOT"
cat > "$SITE_ROOT/.htaccess" << EOF
PassengerNodejs $NODE_PATH
PassengerAppRoot $APP_ROOT
PassengerAppType node
PassengerStartupFile passenger-start.js
EOF
chmod 644 "$SITE_ROOT/.htaccess"

echo "→ public_html → static…"
mkdir -p "$APP_ROOT/public"
if [ ! -d "$APP_ROOT/public" ]; then
  echo "Ошибка: нет каталога $APP_ROOT/public после сборки"
  exit 1
fi
# Не удаляем public_html до проверки standalone — иначе при падении сборки сайт отдаёт 403.
if [ -e "$SITE_ROOT/public_html" ] && [ ! -L "$SITE_ROOT/public_html" ]; then
  echo "  public_html — каталог, не symlink. Переименуем в public_html.bak"
  mv "$SITE_ROOT/public_html" "$SITE_ROOT/public_html.bak.$(date +%s)"
fi
ln -sfn "$APP_ROOT/public" "$SITE_ROOT/public_html"
chmod -R a+rx "$APP_ROOT" "$SITE_ROOT/.node" 2>/dev/null || true

mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

load_env_for_build
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
  fi
fi

DEPLOY_OK=1

echo ""
echo "→ Проверка сайта…"
chmod +x "$REPO_ROOT/scripts/beget-verify.sh"
if ! "$REPO_ROOT/scripts/beget-verify.sh"; then
  echo ""
  echo "Проверка не пройдена. Диагностика: ./scripts/beget-diagnose.sh"
  exit 1
fi

echo ""
echo "Готово. Сайт: $SITE_ROOT"
echo "Перезапуск приложения: touch $APP_ROOT/tmp/restart.txt"
