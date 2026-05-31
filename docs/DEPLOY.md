# Деплой на Beget (billiard.guru)

Инструкция по [Node.js на Beget](https://beget.com/ru/kb/how-to/web-apps/node-js) и [MySQL](https://beget.com/ru/kb/manual/mysql).

## 1. Подключение

```bash
ssh bziksv@bziksv.beget.tech
ssh localhost -p 222          # Docker-окружение, в prompt будет (docker)
```

## 2. Node.js

**Важно:** бинарник с nodejs.org (v20/v24) на старом Beget (Ubuntu 18.04) падает с `GLIBC_2.27 not found`. Нужна сборка Beget или Node ≤17.9.1.

Проверьте ОС:

```bash
ssh localhost -p 222    # Docker
cat /etc/os-release
```

### Ubuntu 18.04 (типичный shared-хостинг)

```bash
cd ~/billiard.guru/setka
./scripts/beget-install-node.sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
node -v    # должно быть v21.7.3 без ошибок GLIBC
```

На Node 21 **не запускается** `prisma generate` (Prisma 7 требует Node ≥22.12). Сгенерированный клиент лежит в git; после правок `schema.prisma` на Mac: `npm run db:generate` → commit → push.

### Ubuntu 22.04

```bash
mkdir -p ~/.local && cd ~/.local
wget https://nodejs.org/download/release/v24.15.0/node-v24.15.0-linux-x64.tar.xz
tar xfv node-v24.15.0-linux-x64.tar.xz --strip 1
export PATH="$HOME/.local/bin:$PATH"
node -v
```

Откройте **общий доступ** к `~/.local` (Панель → FTP), иначе Passenger не увидит node — см. [инструкцию Beget](https://beget.com/ru/kb/how-to/web-apps/node-js).

Скрипт `beget-setup.sh` копирует Node в `~/billiard.guru/.node/` — Passenger запускает его оттуда (ошибка `Permission denied` на `~/.local/bin/node`).

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

Скрипт собирает Next.js (standalone), создаёт `~/billiard.guru/.htaccess`, симлинк `public_html` и **регистрирует Telegram webhook**.

## 6. Telegram webhook

Выставляется автоматически в `beget-setup.sh` (из `APP_URL` или `TELEGRAM_WEBHOOK_URL` в `.env`).

Вручную с Mac:

```bash
cd apps/web && npm run telegram:webhook
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

## 403 Forbidden (Apache)

Типичная ошибка: **«You don't have permission to access this resource»** — Apache не видит приложение Passenger, а не ошибка Next.js.

**Частые причины:**

1. **Битая ссылка `public_html`** — после неудачной сборки `npm run build` каталог `.next/standalone` исчез, а symlink остался.
2. **Нет `.htaccess`** в `~/billiard.guru/` или сборка не запускалась после `git pull`.
3. **Node недоступен для Apache** — не открыт общий доступ к `~/.local` или не скопирован в `~/billiard.guru/.node/`.
4. **FTP-аккаунт прикреплён к `public_html`** — на Beget это ломает доступ к статике ([инструкция Beget](https://beget.com/ru/kb/how-to/web-apps/node-js)).

**Диагностика на сервере:**

```bash
ssh bziksv@bziksv.beget.tech
ssh localhost -p 222
cd ~/billiard.guru/setka
chmod +x scripts/beget-diagnose.sh
./scripts/beget-diagnose.sh
```

**Исправление (пересборка и пересоздание symlink):**

```bash
cd ~/billiard.guru/setka
git pull
./scripts/beget-setup.sh
```

Если `beget-setup.sh` падает — сайт останется 403 до успешной сборки. Смотрите вывод скрипта (Node, `npm run build`, DATABASE_URL).
