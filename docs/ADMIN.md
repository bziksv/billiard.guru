# Админ-панель billiard.guru

## Возможности

- Регистрация **клубов** (название, город, телефон, email)
- Регистрация **игроков** (ФИО, город, фото, телефон, email, рейтинг)
- Создание **турниров** (олимпийская / швейцарская система)
- Регистрация участников клубом или самостоятельно
- **Рейтинг** с шагом 0,5 и пересчёт после матча
- **Калькулятор форы** (система 0,5)
- Подтверждение через **Telegram** (телефон + бот)

## Маршруты

| URL | Описание |
|-----|----------|
| `/admin` | Обзор |
| `/admin/clubs` | Список клубов |
| `/admin/clubs/new` | Регистрация клуба |
| `/admin/players` | Список игроков |
| `/admin/players/new` | Регистрация игрока |
| `/admin/tournaments` | Турниры и регистрации |
| `/admin/handicap` | Калькулятор форы |

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/geo` | Страны и города (RU) |
| GET/POST | `/api/clubs` | Клубы |
| GET/POST | `/api/players` | Игроки (POST — multipart с фото) |
| GET/POST | `/api/tournaments` | Турниры |
| POST/PATCH | `/api/tournaments/register` | Регистрация на турнир |
| GET | `/api/handicap` | Расчёт форы |
| GET/POST | `/api/rating` | Рейтинг игрока / пересчёт после матча |
| POST | `/api/telegram/webhook` | Webhook Telegram-бота |

## Telegram

### Как это работает

1. Бот **не может** первым написать пользователю — только после **Start**
2. **По ссылке** `confirm_<token>` — подтверждение сразу
3. **Просто /start** — бот покажет кнопку «📱 Подтвердить по телефону»; если номер есть в базе → подтверждение сразу

### Локально (один терминал)

Telegram **не может** слать updates на `localhost`. Но polling **не нужен**, если в `.env` та же Beget-база, что и на проде:

```bash
cd apps/web
npm run dev
```

1. Открываете `http://localhost:3010`
2. Жмёте «Войти через Telegram» — сообщение приходит в бот
3. Нажимаете кнопку — **webhook на billiard.guru** пишет `CONFIRMED` в общую БД
4. Браузер на localhost сам завершает вход

В `.env` обязательно:

```env
DATABASE_URL=mysql://...@bziksv.beget.tech:3306/bziksv_bil
TELEGRAM_WEBHOOK_URL=https://billiard.guru/api/telegram/webhook
```

После деплоя webhook ставится сам (`beget-setup.sh`). Вручную:

```bash
cd apps/web && npm run telegram:webhook
```

**Не запускайте** `npm run telegram:poll` — он снимает webhook и ломает вход на billiard.guru. Только офлайн с локальной БД: `npm run telegram:poll -- --force` (при Ctrl+C webhook восстанавливается).

### Production (billiard.guru)

Webhook выставляется при `./scripts/beget-setup.sh`. Проверка:

```bash
curl -s "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

В `.env`:
```env
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=BilliardGuruBot
TELEGRAM_WEBHOOK_SECRET=случайная_строка
```

## Система форы (0,5)

| Разница рейтингов | Фора |
|-------------------|------|
| 0 | нет |
| 0,5 | 1 шар в **нечётных** партиях |
| 1,0 | 1 шар в **каждой** партии |
| 1,5 | 1 шар каждую + 1 шар в нечётных |
| 2,0 | 2 шара в каждой партии |

## Рейтинг

- Шаг изменения: **0,5**
- Победа над равным/сильнее: +0,5 / −0,5
- Победа фаворита (разница ≥ 0,5): 0 / −0,5

## Запуск

См. **[docs/SETUP.md](SETUP.md)** — пошагово для Mac без Docker.

Кратко:

```bash
cd ~/Documents/projects/setka/apps/web
cp .env.example .env
npm install && npm run db:push && npm run db:seed
npm run dev                   # http://localhost:3010
```
