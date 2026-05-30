#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"

echo "→ Проект: $ROOT"

if [ ! -f "$WEB/package.json" ]; then
  echo "❌ Не найден apps/web/package.json"
  echo "   Запускайте из репозитория setka: cd ~/Documents/projects/setka"
  exit 1
fi

cd "$WEB"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Создан .env"
fi

echo "→ npm install..."
npm install

if ! command -v mysql &>/dev/null; then
  echo ""
  echo "⚠ MySQL клиент не найден. Варианты:"
  echo "  docker compose up -d   # из корня проекта"
  echo "  brew install mysql && brew services start mysql"
  echo ""
  echo "Подробнее: docs/SETUP.md"
  exit 1
fi

echo "→ prisma db push..."
npm run db:push

echo "→ seed..."
npm run db:seed

echo ""
echo "✓ Готово! Запуск:"
echo "  cd $WEB && npm run dev"
echo "  http://localhost:3010/admin"
