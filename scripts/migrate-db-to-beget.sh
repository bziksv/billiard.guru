#!/usr/bin/env bash
# Перенос локальной MySQL (setka) на Beget.
# Требует: mysqldump, mysql или python3 + pymysql (venv создаётся автоматически).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
DUMP="${TMPDIR:-/tmp}/setka_dump_$(date +%Y%m%d_%H%M%S).sql"
LOCAL_URL="${LOCAL_DATABASE_URL:-mysql://root@127.0.0.1:3306/setka}"

if [ -f "$WEB/.env" ]; then
  REMOTE_URL="$(grep '^DATABASE_URL=' "$WEB/.env" | cut -d= -f2- | tr -d '"')"
else
  echo "Нет $WEB/.env — задайте DATABASE_URL на Beget вручную."
  exit 1
fi

echo "→ Дамп локальной базы ($LOCAL_URL)…"
mysqldump -u root -h 127.0.0.1 setka \
  --single-transaction --routines --triggers --set-gtid-purged=OFF \
  > "$DUMP"
echo "  ✓ $DUMP ($(wc -c < "$DUMP" | tr -d ' ') bytes)"

parse_url() {
  python3 - "$1" << 'PY'
import sys
from urllib.parse import urlparse, unquote
u = urlparse(sys.argv[1])
print(unquote(u.username or ""))
print(unquote(u.password or ""))
print(u.hostname or "localhost")
print(u.port or 3306)
print(u.path.lstrip("/"))
PY
}

PARTS=()
while IFS= read -r line; do PARTS+=("$line"); done < <(parse_url "$REMOTE_URL")
DB_USER="${PARTS[0]}"
DB_PASS="${PARTS[1]}"
DB_HOST="${PARTS[2]}"
DB_PORT="${PARTS[3]}"
DB_NAME="${PARTS[4]}"

echo "→ Проверка подключения к ${DB_HOST}:${DB_PORT}/${DB_NAME} ..."

VENV="${TMPDIR:-/tmp}/setka-mysql-venv"
if [ ! -x "$VENV/bin/python3" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install -q pymysql
fi

if ! BEGET_DB_HOST="$DB_HOST" BEGET_DB_PORT="$DB_PORT" BEGET_DB_USER="$DB_USER" BEGET_DB_PASS="$DB_PASS" BEGET_DB_NAME="$DB_NAME" \
  "$VENV/bin/python3" -c "
import os, pymysql, sys
try:
    pymysql.connect(
        host=os.environ['BEGET_DB_HOST'],
        port=int(os.environ['BEGET_DB_PORT']),
        user=os.environ['BEGET_DB_USER'],
        password=os.environ['BEGET_DB_PASS'],
        database=os.environ['BEGET_DB_NAME'],
        charset='utf8mb4',
        connect_timeout=10,
    ).close()
except Exception as e:
    print(e, file=sys.stderr)
    sys.exit(1)
" 2>/dev/null; then
  echo ""
  echo "✗ Нет доступа к $DB_HOST (часто: не включено внешнее подключение в Beget)."
  echo ""
  echo "Варианты импорта:"
  echo "  1. phpMyAdmin: https://spectre.beget.com/phpMyAdmin → bziksv_bil → Импорт → $DUMP"
  echo "  2. SSH на Beget (localhost):"
  echo "       scp $DUMP bziksv@bziksv.beget.tech:~/billiard.guru/setka/"
  echo "       ssh bziksv@bziksv.beget.tech"
  echo "       cd ~/billiard.guru/setka && ./scripts/beget-import-on-server.sh $(basename "$DUMP")"
  echo ""
  echo "На сервере в apps/web/.env используйте localhost, не bziksv.beget.tech"
  exit 1
fi

echo "  ✓ Подключение OK"

echo "→ Импорт дампа…"
"$VENV/bin/python3" - "$DB_HOST" "$DB_PORT" "$DB_USER" "$DB_PASS" "$DB_NAME" "$DUMP" << 'PY'
import sys
import pymysql

host, port, user, password, database, dump_path = sys.argv[1:7]
port = int(port)

conn = pymysql.connect(
    host=host, port=port, user=user, password=password,
    database=database, charset="utf8mb4",
)

with open(dump_path, "r", encoding="utf-8", errors="replace") as f:
    sql = f.read()

lines = []
for line in sql.splitlines():
    if line.startswith("SET @@GLOBAL.GTID_PURGED"):
        continue
    if line.startswith("CREATE DATABASE") or line.startswith("USE "):
        continue
    lines.append(line)
sql = "\n".join(lines)

with conn.cursor() as cur:
    for stmt in sql.split(";\n"):
        stmt = stmt.strip()
        if not stmt or stmt.startswith("--"):
            continue
        cur.execute(stmt)
conn.commit()

with conn.cursor() as cur:
    cur.execute("SHOW TABLES")
    tables = [r[0] for r in cur.fetchall()]
print("  ✓ Таблицы:", ", ".join(tables))
conn.close()
PY

echo "→ Prisma db push (схема на Beget)…"
cd "$WEB"
npx prisma db push

echo "Готово. Дамп сохранён: $DUMP"
