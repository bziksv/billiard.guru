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

### Локально (без webhook)

Telegram не шлёт updates на `localhost`. Запустите **второй терминал**:

```bash
cd apps/web
npm run telegram:poll
```

Затем откройте ссылку подтверждения и нажмите **Start**.

### Production (billiard.guru)

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://billiard.guru/api/telegram/webhook"
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
