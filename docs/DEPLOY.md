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
chmod +x scripts/beget-setup.sh scripts/beget-deploy.sh scripts/beget-rollback.sh
./scripts/beget-setup.sh
```

Скрипт собирает Next.js в **staging** (`apps/web/.next/standalone`), копирует в `~/billiard.guru/releases/<id>`, переключает symlink **`~/billiard.guru/current`**, создаёт `.htaccess`, `public_html` и **регистрирует Telegram webhook**.

**Важно:** Passenger указывает на стабильный путь `~/billiard.guru/current`, а не на `.next/standalone` в git. Пока идёт `npm run build` (Next.js удаляет `.next/`), live-трафик обслуживает **предыдущий релиз**.

## 6. Telegram webhook

Выставляется автоматически в `beget-setup.sh` (из `APP_URL` или `TELEGRAM_WEBHOOK_URL` в `.env`).

Вручную с Mac:

```bash
cd apps/web && npm run telegram:webhook
```

## Обновление после git push

Рекомендуемый способ (pull + atomic deploy):

```bash
cd ~/billiard.guru/setka
./scripts/beget-deploy.sh
```

Или вручную:

```bash
cd ~/billiard.guru/setka
git pull
./scripts/beget-setup.sh
```

Быстрый повторный деплой без `npm install` (если зависимости не менялись):

```bash
BEGET_SKIP_INSTALL=1 ./scripts/beget-setup.sh
```

### Откат без пересборки

Если после деплоя сайт отдаёт 5xx (Beget «A server error occurred», ERROR 1305321563):

```bash
cd ~/billiard.guru/setka
./scripts/beget-rollback.sh
```

Конкретный релиз:

```bash
./scripts/beget-rollback.sh 20250608-143022-abc1234
./scripts/beget-diagnose.sh   # список релизов
```

`beget-setup.sh` сам делает health-check после переключения; при неудаче откатывает на `previous`.

## Структура на сервере

```
~/billiard.guru/
  .htaccess              # PassengerAppRoot → ~/billiard.guru/current
  current/               # symlink → releases/<id>  (live)
  previous/              # symlink → предыдущий релиз (для отката)
  releases/
    20250608-143022-abc1234/
      server.js, public/, RELEASE.json
  public_html/           # symlink → current/public
  setka/                 # git-репозиторий
    apps/web/
      .env
      .next/standalone/  # staging сборки (не используется Passenger напрямую)
```

Перезапуск без пересборки: `touch ~/billiard.guru/current/tmp/restart.txt`

## 403 Forbidden (Apache)

Типичная ошибка: **«You don't have permission to access this resource»** — Apache не видит приложение Passenger, а не ошибка Next.js.

### Почему сайт падал во время деплоя (legacy layout)

Раньше `PassengerAppRoot` указывал на `setka/apps/web/.next/standalone`. Next.js **удаляет `.next/`** в начале каждой сборки — на 2–5 минут prod ломался, даже если build потом проходил успешно.

**С atomic releases:** Passenger всегда смотрит на `~/billiard.guru/current`. Сборка идёт в staging; переключение — только после успешного build + health-check.

### Почему 403 после неудачной сборки

1. `./scripts/beget-setup.sh` запускает `npm run build`
2. Если сборка **падает** до promote — `current` **не меняется**, сайт остаётся на старом релизе
3. 403 возможен только если `current`/`public_html` битые или нет `.htaccess` — см. `beget-diagnose.sh`

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

**Проверка после деплоя (обязательно):**

```bash
cd ~/billiard.guru/setka
./scripts/beget-verify.sh
# или с Mac:
curl -s -o /dev/null -w "%{http_code}" -L https://billiard.guru/
# ожидается 200, не 403
```

`beget-setup.sh` вызывает `beget-verify.sh` автоматически в конце.

## 500 / «Cannot find module dotenv»

Passenger не стартует, в логах:

```
Error: Cannot find module 'dotenv'
Require stack: .../passenger-start.js
```

**Причина:** релиз в `~/billiard.guru/releases/` изолирован от `setka/apps/web/node_modules`. Старый `passenger-start.js` делал `require("dotenv")`, которого нет в traced `node_modules` standalone.

**Быстро (без пересборки):**

```bash
cd ~/billiard.guru/setka
git pull
./scripts/beget-fix-passenger.sh
```

**Полный деплой:**

```bash
./scripts/beget-deploy.sh
```
