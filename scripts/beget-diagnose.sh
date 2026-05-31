#!/usr/bin/env bash
# Диагностика 403 Forbidden на billiard.guru (Beget + Passenger).
# Запуск на сервере в Docker:
#   ssh bziksv@bziksv.beget.tech
#   ssh localhost -p 222
#   cd ~/billiard.guru/setka && ./scripts/beget-diagnose.sh
set -u

SITE_ROOT="${SITE_ROOT:-$HOME/billiard.guru}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$REPO_ROOT/apps/web"
STANDALONE="$WEB/.next/standalone"
HTACCESS="$SITE_ROOT/.htaccess"
PUBLIC_HTML="$SITE_ROOT/public_html"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; }

echo "=== billiard.guru — диагностика 403 ==="
echo "SITE_ROOT=$SITE_ROOT"
echo ""

if [ ! -d "$SITE_ROOT" ]; then
  fail "Каталог сайта не найден: $SITE_ROOT"
  echo "  Создайте сайт в панели Beget → Сайты → каталог ~/billiard.guru/"
  exit 1
fi
ok "Каталог сайта существует"

if [ ! -f "$HTACCESS" ]; then
  fail "Нет $HTACCESS — Passenger не настроен"
  echo "  Запустите: cd ~/billiard.guru/setka && ./scripts/beget-setup.sh"
else
  ok ".htaccess найден"
  echo "--- $HTACCESS ---"
  cat "$HTACCESS"
  echo "----------------"
fi

if [ ! -d "$STANDALONE" ]; then
  fail "Нет сборки: $STANDALONE"
  echo "  Сборка не выполнялась или упала. Запустите ./scripts/beget-setup.sh"
elif [ ! -f "$STANDALONE/server.js" ]; then
  fail "Нет server.js в standalone"
else
  ok "standalone/server.js на месте"
fi

if [ ! -e "$PUBLIC_HTML" ]; then
  fail "Нет public_html — Apache отдаёт 403"
  echo "  Запустите ./scripts/beget-setup.sh"
elif [ -L "$PUBLIC_HTML" ]; then
  target="$(readlink -f "$PUBLIC_HTML" 2>/dev/null || readlink "$PUBLIC_HTML")"
  if [ ! -d "$target" ]; then
    fail "Битая ссылка public_html → $target"
    echo "  Частая причина: git pull / npm run build удалил .next, ссылка указывает в никуда"
    echo "  Запустите: cd ~/billiard.guru/setka && ./scripts/beget-setup.sh"
  else
    ok "public_html → $target"
  fi
else
  warn "public_html — обычная папка, не symlink (на Beget нужен ln -s на public standalone)"
fi

if [ -f "$HTACCESS" ]; then
  node_path="$(grep '^PassengerNodejs' "$HTACCESS" | awk '{print $2}')"
  app_root="$(grep '^PassengerAppRoot' "$HTACCESS" | awk '{print $2}')"
  if [ -n "$node_path" ]; then
    if [ -x "$node_path" ]; then
      ok "Node: $node_path ($("$node_path" -v 2>/dev/null || echo '?'))"
    else
      fail "Node недоступен для Apache: $node_path"
      echo "  Запустите ./scripts/beget-setup.sh или ./scripts/beget-install-node.sh"
      echo "  На Beget: откройте общий доступ к ~/.local (Панель → FTP)"
    fi
  fi
  if [ -n "$app_root" ]; then
    if [ -d "$app_root" ]; then
      ok "PassengerAppRoot: $app_root"
      if [ ! -r "$app_root/server.js" ]; then
        fail "Apache не может прочитать $app_root/server.js — проверьте права (chmod -R a+rx)"
      fi
    else
      fail "PassengerAppRoot не существует: $app_root"
    fi
  fi
fi

if [ -f "$WEB/.env" ]; then
  ok ".env найден"
else
  warn "Нет $WEB/.env"
fi

echo ""
echo "=== Права (Apache должен читать все каталоги в пути) ==="
for dir in "$HOME" "$SITE_ROOT" "$STANDALONE" "$SITE_ROOT/.node"; do
  [ -e "$dir" ] || continue
  perms="$(stat -c '%a %U:%G' "$dir" 2>/dev/null || stat -f '%OLp %Su:%Sg' "$dir" 2>/dev/null || echo '?')"
  echo "  $dir → $perms"
done

echo ""
echo "=== Рекомендуемое исправление ==="
echo "  cd ~/billiard.guru/setka"
echo "  git pull"
echo "  ./scripts/beget-setup.sh"
echo ""
echo "Если сборка падает — пришлите вывод скрипта в поддержку / чат."
