# Деплой на Beget (billiard.guru)

Инструкция по [Node.js на Beget](https://beget.com/ru/kb/how-to/web-apps/node-js) и [MySQL](https://beget.com/ru/kb/manual/mysql).

## 1. Подключение

```bash
ssh bziksv@bziksv.beget.tech
ssh localhost -p 222          # Docker-окружение, в prompt будет (docker)
```

## 2. Node.js (если ещё нет)

```bash
mkdir -p ~/.local && cd ~/.local
wget https://nodejs.org/download/release/v24.15.0/node-v24.15.0-linux-x64.tar.xz
tar xfv node-v24.15.0-linux-x64.tar.xz --strip 1
rm node-v24.15.0-linux-x64.tar.xz
node -v && npm -v
```

Откройте общий доступ к `~/.local` (Панель → FTP → общий доступ), если Passenger не видит node.

## 3. Клонирование

Сайт должен быть создан в разделе **Сайты** (например `billiard.guru` → каталог `~/billiard.guru/`).

```bash
cd ~/billiard.guru
git clone https://github.com/bziksv/billiard.guru.git setka
cd setka
```

## 4. Переменные окружения

```bash
cd ~/billiard.guru/setka/apps/web
cp .env.example .env
nano .env
```

Production `.env`:

```env
PORT=3010
NODE_ENV=production
DATABASE_URL=mysql://bziksv_bil:PASSWORD@localhost:3306/bziksv_bil
APP_URL=https://billiard.guru
NEXT_PUBLIC_APP_URL=https://billiard.guru
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=BilliardGuruBot
TELEGRAM_WEBHOOK_SECRET=случайная_строка
SESSION_SECRET=длинная_случайная_строка
LOG_LEVEL=info
APP_VERSION=0.1.0
```

Пароль в `DATABASE_URL` URL-encode: `&` → `%26`, `!` → `%21`.

## 5. Сборка и запуск

```bash
cd ~/billiard.guru/setka
chmod +x scripts/beget-setup.sh
./scripts/beget-setup.sh
```

Скрипт собирает Next.js (standalone), создаёт `~/billiard.guru/.htaccess` и симлинк `public_html`.

## 6. Telegram webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://billiard.guru/api/telegram/webhook"
```

## Обновление после git push

```bash
cd ~/billiard.guru/setka
git pull
./scripts/beget-setup.sh
```

## Структура на сервере

```
~/billiard.guru/
  .htaccess              # Passenger → server.js
  public_html/           # symlink → .next/standalone/public
  setka/                 # git-репозиторий
    apps/web/
      .env
      .next/standalone/  # server.js, tmp/restart.txt
```

Перезапуск без пересборки: `touch ~/billiard.guru/setka/apps/web/.next/standalone/tmp/restart.txt`
