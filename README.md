# billiard.guru — сервис турниров по бильярду

**Production:** https://billiard.guru  
**Локально:** http://localhost:3010

Платформа для проведения турниров: сайт, регистрация участников, сетки (bracket) и публичный бильборд с live-обновлениями.

## Стек (рекомендация)

| Слой | Технология | Зачем |
|------|------------|-------|
| Frontend | **Next.js 15** + TypeScript | SSR для публичных страниц, API routes, один репозиторий |
| UI | **Tailwind CSS** + **shadcn/ui** | Быстрая вёрстка, готовые компоненты |
| Сетки | Кастомный bracket-компонент или **React Flow** | Визуализация и редактирование сеток |
| Backend | **NestJS** (или Next.js API при малой команде) | Доменная логика: турниры, матчи, посев |
| БД | **MySQL** + **Prisma** | Связи турнир → участник → матч → результат |
| Real-time | **Redis** + **Socket.io** / SSE | Live-бильборд, обновление счёта без перезагрузки |
| Auth | **NextAuth.js** / Clerk | Регистрация организаторов и игроков |
| Deploy | **Docker** | Единая среда dev/prod |

### Почему так

- Турниры — реляционная модель (игроки, раунды, матчи) → MySQL.
- Бильборд требует push-обновлений → WebSocket/SSE + Redis pub/sub.
- Сетки — интерактивный UI → React + TypeScript.
- Один порт **3010** для dev (см. [docs/STANDARDS.md](docs/STANDARDS.md)).

## Быстрый старт

> ⚠️ Команды запускать из папки проекта: `cd ~/Documents/projects/setka`  
> Docker **не обязателен** — см. [docs/SETUP.md](docs/SETUP.md)

```bash
cd ~/Documents/projects/setka
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh          # MySQL + миграции + seed

cd apps/web
npm run dev                     # http://localhost:3010/admin
```

Если MySQL ещё нет:

```bash
# Docker
docker compose up -d

# или Homebrew
brew install mysql && brew services start mysql
mysql -u root -e "CREATE DATABASE setka;"
```

## Документация

- [Запуск и troubleshooting](docs/SETUP.md)
- [Стандарты и правила проекта](docs/STANDARDS.md)
- [Версионность и логирование](docs/VERSIONING.md)
- [Админ-панель](docs/ADMIN.md)

## Структура (целевая)

```
setka/
├── apps/web/          # Next.js — сайт + бильборд
├── apps/api/          # NestJS — бизнес-логика (опционально)
├── packages/shared/   # типы, константы
├── docs/              # документация
└── docker-compose.yml
```

## MVP-функции

1. Создание турнира (формат: single/double elimination, round-robin)
2. Регистрация участников (вручную + ссылка)
3. Генерация и редактирование сетки
4. Ввод результатов матчей
5. Публичный бильборд с live-обновлениями
