#!/usr/bin/env bash
# Проверка billiard.guru после деплоя (403 = Passenger/standalone сломан).
# На сервере: cd ~/billiard.guru/setka && ./scripts/beget-verify.sh
# Локально (prod URL): APP_URL=https://billiard.guru ./scripts/beget-verify.sh
set -u

SITE_ROOT="${SITE_ROOT:-$HOME/billiard.guru}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$REPO_ROOT/apps/web"
STANDALONE="$WEB/.next/standalone"
HTACCESS="$SITE_ROOT/.htaccess"
PUBLIC_HTML="$SITE_ROOT/public_html"
ENV_FILE="$WEB/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

failures=0

ok() { echo -e "${GREEN}✓${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; failures=$((failures + 1)); }

APP_URL_OVERRIDE="${APP_URL:-}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ENV_FILE"
  set +a
fi
if [ -n "$APP_URL_OVERRIDE" ]; then
  APP_URL="$APP_URL_OVERRIDE"
fi

CHECK_URL="${APP_URL:-https://billiard.guru}"
CHECK_URL="${CHECK_URL%/}"

echo "=== billiard.guru — проверка после деплоя ==="
echo "URL: $CHECK_URL"
echo ""

if [ -f "$HTACCESS" ]; then
  ok ".htaccess"

  if [ ! -f "$STANDALONE/server.js" ]; then
    fail "Нет $STANDALONE/server.js — сборка не завершилась"
  else
    ok "standalone/server.js"
  fi

  if [ ! -e "$PUBLIC_HTML" ]; then
    fail "Нет public_html"
  elif [ -L "$PUBLIC_HTML" ]; then
    target="$(readlink -f "$PUBLIC_HTML" 2>/dev/null || readlink "$PUBLIC_HTML")"
    if [ ! -d "$target" ]; then
      fail "Битый symlink public_html → $target"
    else
      ok "public_html → $target"
    fi
  else
    fail "public_html не symlink — нужен ln -s на standalone/public"
  fi

  if [ -f "$HTACCESS" ]; then
    node_path="$(grep '^PassengerNodejs' "$HTACCESS" | awk '{print $2}')"
    if [ -n "$node_path" ] && [ ! -x "$node_path" ]; then
      fail "Node недоступен для Apache: $node_path"
    elif [ -n "$node_path" ]; then
      ok "Passenger Node: $node_path"
    fi
  fi
else
  echo "(Passenger/symlink — проверка на сервере после beget-setup.sh)"
fi

echo ""
echo "→ HTTP $CHECK_URL …"
http_code="$(curl -sS -o /dev/null -w "%{http_code}" -L "$CHECK_URL" --max-time 45 2>/dev/null || echo "000")"
echo "   код ответа: $http_code"

case "$http_code" in
  200|301|302|307|308)
    ok "Сайт отвечает ($http_code)"
    ;;
  403)
    fail "403 Forbidden — Apache/Passenger не видит приложение (не Next.js)"
    echo "  ./scripts/beget-diagnose.sh"
    echo "  ./scripts/beget-setup.sh"
    ;;
  000)
    fail "Не удалось подключиться к $CHECK_URL (сеть или DNS)"
    ;;
  5*)
    fail "Ошибка сервера HTTP $http_code — смотрите логи Passenger"
    ;;
  *)
    fail "Неожиданный HTTP $http_code (ожидали 200/3xx)"
    ;;
esac

echo ""
if [ "$failures" -gt 0 ]; then
  echo -e "${RED}Проверка не пройдена ($failures).${NC}"
  exit 1
fi

echo -e "${GREEN}Проверка пройдена.${NC}"
exit 0
