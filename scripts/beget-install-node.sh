#!/usr/bin/env bash
# Установка Node.js, совместимого с Beget (старый GLIBC на Ubuntu 18.04).
# Запуск: ./scripts/beget-install-node.sh
set -euo pipefail

LOCAL="$HOME/.local"
mkdir -p "$LOCAL"
cd "$LOCAL"

if grep -q 'VERSION_ID="22' /etc/os-release 2>/dev/null; then
  NODE_URL="https://nodejs.org/download/release/v24.15.0/node-v24.15.0-linux-x64.tar.xz"
  NODE_ARCHIVE="node-v24.15.0-linux-x64.tar.xz"
  echo "→ Ubuntu 22.04: официальный Node 24"
else
  NODE_URL="https://cp.beget.com/shared/mB-V_No-S9dWbtrsnWD0XzyKUepOwM2A/node-v21.7.3-bionic.tar.xz"
  NODE_ARCHIVE="node-v21.7.3-bionic.tar.xz"
  echo "→ Ubuntu 18.04 / старый GLIBC: сборка Beget Node 21"
fi

echo "→ Загрузка $NODE_URL"
wget -q "$NODE_URL" -O "$NODE_ARCHIVE"
tar xfv "$NODE_ARCHIVE" --strip 1
rm -f "$NODE_ARCHIVE"

export PATH="$LOCAL/bin:$PATH"
echo ""
echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo ""
echo "Добавьте в ~/.bashrc:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "Откройте общий доступ к ~/.local в панели Beget (FTP), если Passenger не видит node."
