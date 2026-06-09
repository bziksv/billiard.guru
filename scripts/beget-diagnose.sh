#!/usr/bin/env bash
# Диагностика 403/5xx на billiard.guru (Beget + Passenger).
# Запуск на сервере в Docker:
#   ssh bziksv@bziksv.beget.tech
#   ssh localhost -p 222
#   cd ~/billiard.guru/setka && ./scripts/beget-diagnose.sh
set -u

SITE_ROOT="${SITE_ROOT:-$HOME/billiard.guru}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=beget-lib.sh
source "$REPO_ROOT/scripts/beget-lib.sh"

WEB="$BEGET_WEB"
STANDALONE="$BEGET_STANDALONE"
HTACCESS="$BEGET_HTACCESS"
PUBLIC_HTML="$BEGET_PUBLIC_HTML"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*"; }

echo "=== billiard.guru — диагностика ==="
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

if [ -L "$BEGET_CURRENT" ] && [ -f "$(beget_current_release_dir)/server.js" ]; then
  ok "current → $(beget_current_release_dir)"
  if [ -f "$(beget_current_release_dir)/RELEASE.json" ]; then
    echo "  RELEASE.json: $(cat "$(beget_current_release_dir)/RELEASE.json")"
  fi
else
  warn "Нет live-релиза (~/billiard.guru/current)"
  if [ -f "$STANDALONE/server.js" ]; then
    warn "Есть staging standalone — запустите beget-setup.sh для promote"
  fi
fi

if [ -L "$BEGET_PREVIOUS" ]; then
  ok "previous → $(readlink -f "$BEGET_PREVIOUS" 2>/dev/null || readlink "$BEGET_PREVIOUS")"
fi

if [ -d "$BEGET_RELEASES" ]; then
  echo ""
  echo "=== Релизы ==="
  beget_list_releases
fi

if [ ! -e "$PUBLIC_HTML" ]; then
  fail "Нет public_html — Apache отдаёт 403"
  echo "  Запустите ./scripts/beget-setup.sh"
elif [ -L "$PUBLIC_HTML" ]; then
  target="$(readlink -f "$PUBLIC_HTML" 2>/dev/null || readlink "$PUBLIC_HTML")"
  if [ ! -d "$target" ]; then
    fail "Битая ссылка public_html → $target"
    echo "  Запустите: cd ~/billiard.guru/setka && ./scripts/beget-setup.sh"
  else
    ok "public_html → $target"
  fi
else
  warn "public_html — обычная папка, не symlink (на Beget нужен ln -s на current/public)"
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
    if [ -d "$app_root" ] || [ -L "$app_root" ]; then
      resolved="$(readlink -f "$app_root" 2>/dev/null || echo "$app_root")"
      ok "PassengerAppRoot: $app_root → $resolved"
      if [ ! -r "$resolved/server.js" ] && [ ! -r "$app_root/server.js" ]; then
        fail "Apache не может прочитать server.js — проверьте права (chmod -R a+rx)"
      fi
      if [[ "$app_root" == *".next/standalone"* ]]; then
        warn "Legacy layout: Passenger указывает на .next/standalone"
        echo "  При каждой сборке Next.js удаляет .next — сайт падает на время build."
        echo "  Обновите: git pull && ./scripts/beget-setup.sh (atomic releases → ~/current)"
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
for dir in "$HOME" "$SITE_ROOT" "$BEGET_CURRENT" "$BEGET_RELEASES" "$SITE_ROOT/.node"; do
  [ -e "$dir" ] || continue
  perms="$(stat -c '%a %U:%G' "$dir" 2>/dev/null || stat -f '%OLp %Su:%Sg' "$dir" 2>/dev/null || echo '?')"
  echo "  $dir → $perms"
done

echo ""
echo "=== Рекомендуемое исправление ==="
echo "  cd ~/billiard.guru/setka"
echo "  git pull"
echo "  ./scripts/beget-deploy.sh          # pull + atomic deploy"
echo "  ./scripts/beget-rollback.sh        # откат на previous без пересборки"
echo ""
echo "Если сборка падает — live-сайт остаётся на previous release."
echo "Если 5xx после успешного деплоя — ./scripts/beget-rollback.sh и логи Passenger в панели Beget."
