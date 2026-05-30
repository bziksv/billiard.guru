# Запуск billiard.guru (Mac)

## Домен

| Окружение | URL |
|-----------|-----|
| Production | https://billiard.guru |
| Локально | http://localhost:3010 |

---

## Ошибка «command not found: docker» / «cd: apps/web»

Команды нужно запускать **из папки проекта**, не из `~`:

```bash
cd ~/Documents/projects/setka
```

---

## Вариант A: MySQL через Docker (рекомендуется)

```bash
cd ~/Documents/projects/setka
docker compose up -d

cd apps/web
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

`.env`:
```env
DATABASE_URL=mysql://setka:setka@localhost:3306/setka
```

---

## Вариант B: MySQL через Homebrew

```bash
brew install mysql
brew services start mysql
mysql -u root -e "CREATE DATABASE IF NOT EXISTS setka CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

`.env`:
```env
DATABASE_URL=mysql://root@localhost:3306/setka
```

Затем:
```bash
cd ~/Documents/projects/setka/apps/web
npm install && npm run db:push && npm run db:seed && npm run dev
```

---

## Production: billiard.guru

```env
DATABASE_URL=mysql://user:pass@host:3306/setka
APP_URL=https://billiard.guru
NEXT_PUBLIC_APP_URL=https://billiard.guru
```

---

## Одной командой

```bash
cd ~/Documents/projects/setka && ./scripts/dev-setup.sh
```

---

## Чеклист проблем

| Ошибка | Решение |
|--------|---------|
| `docker: command not found` | Homebrew MySQL (вариант B) или Docker Desktop |
| `cd: apps/web` | `cd ~/Documents/projects/setka` |
| `ECONNREFUSED` | MySQL не запущен: `docker compose up -d` или `brew services start mysql` |
| `Access denied` | Проверьте `DATABASE_URL` (логин/пароль) |

> **Миграция с PostgreSQL:** данные не переносятся автоматически — после смены БД выполните `npm run db:push && npm run db:seed`.
