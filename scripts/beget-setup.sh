#!/usr/bin/env bash
# Развёртывание billiard.guru на Beget (Passenger + Next.js standalone).
# Запускать на сервере в Docker: ssh bziksv@bziksv.beget.tech → ssh localhost -p 222
#
#   cd ~/billiard.guru/setka
#   ./scripts/beget-setup.sh
set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

SITE_ROOT="${SITE_ROOT:-$HOME/billiard.guru}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$REPO_ROOT/apps/web"
STANDALONE="$WEB/.next/standalone"

if ! command -v node >/dev/null 2>&1 || ! node -v >/dev/null 2>&1; then
  echo "Node.js не найден или не запускается (ошибка GLIBC)."
  echo "Переустановите совместимую версию:"
  echo "  cd ~/billiard.guru/setka && ./scripts/beget-install-node.sh"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo "См. docs/DEPLOY.md"
  exit 1
fi

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
load_env_for_build
NODE_ENV=production npm run build:beget

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
