#!/usr/bin/env bash
# Запускать на Beget по SSH (MySQL только через localhost).
# Пример:
#   scp /tmp/setka_dump.sql bziksv@bziksv.beget.tech:~/billiard.guru/setka/
#   ssh bziksv@bziksv.beget.tech
#   cd ~/billiard.guru/setka && ./scripts/beget-import-on-server.sh setka_dump.sql
set -euo pipefail

DUMP="${1:-setka_dump.sql}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"

if [ ! -f "$DUMP" ]; then
  echo "Файл не найден: $DUMP"
  echo "С Mac: scp /tmp/setka_dump.sql bziksv@bziksv.beget.tech:~/billiard.guru/setka/"
  exit 1
fi

DB_USER="${BEGET_DB_USER:-bziksv_bil}"
DB_NAME="${BEGET_DB_NAME:-bziksv_bil}"

echo "→ Импорт $DUMP в $DB_NAME (localhost)…"
mysql -h localhost -u "$DB_USER" -p "$DB_NAME" < "$DUMP"

echo "→ Prisma db push…"
cd "$WEB"
if [ ! -f .env ]; then
  echo "Создайте apps/web/.env с DATABASE_URL=mysql://USER:PASS@localhost:3306/$DB_NAME"
  exit 1
fi
npx prisma db push

echo "→ Проверка таблиц…"
mysql -h localhost -u "$DB_USER" -p "$DB_NAME" -e "SHOW TABLES;"

echo "Готово."
