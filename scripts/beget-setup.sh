#!/usr/bin/env bash
# Развёртывание billiard.guru на Beget (Passenger + Next.js standalone).
# Запускать на сервере в Docker: ssh bziksv@bziksv.beget.tech → ssh localhost -p 222
#
#   cd ~/billiard.guru/setka
#   ./scripts/beget-setup.sh
set -euo pipefail

SITE_ROOT="${SITE_ROOT:-$HOME/billiard.guru}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$REPO_ROOT/apps/web"
STANDALONE="$WEB/.next/standalone"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js не найден. Установите в ~/.local — см. docs/DEPLOY.md"
  exit 1
fi

if [ ! -f "$WEB/.env" ]; then
  echo "Создайте $WEB/.env (скопируйте .env.example, localhost для DATABASE_URL)."
  exit 1
fi

echo "→ npm install…"
cd "$WEB"
npm install

echo "→ prisma generate…"
npx prisma generate

echo "→ npm run build…"
NODE_ENV=production npm run build

echo "→ Копируем static в standalone…"
mkdir -p "$STANDALONE/.next"
cp -r public "$STANDALONE/public"
cp -r .next/static "$STANDALONE/.next/static"

NODE_PATH="$(which node)"
APP_ROOT="$(realpath "$STANDALONE")"

echo "→ .htaccess в $SITE_ROOT…"
mkdir -p "$SITE_ROOT"
cat > "$SITE_ROOT/.htaccess" << EOF
PassengerNodejs $NODE_PATH
PassengerAppRoot $APP_ROOT
PassengerAppType node
PassengerStartupFile server.js
EOF

echo "→ public_html → static…"
rm -rf "$SITE_ROOT/public_html"
ln -sfn "$APP_ROOT/public" "$SITE_ROOT/public_html"

mkdir -p "$APP_ROOT/tmp"
touch "$APP_ROOT/tmp/restart.txt"

echo ""
echo "Готово. Сайт: $SITE_ROOT"
echo "Перезапуск приложения: touch $APP_ROOT/tmp/restart.txt"
