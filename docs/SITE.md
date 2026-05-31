# Архитектура сайта billiard.guru

## Зоны

| Зона | URL | Кто видит |
|------|-----|-----------|
| **Публичный сайт** | `/`, `/tournaments`, `/clubs`, `/players` | Все |
| **Аккаунт** | `/login`, `/cabinet` | Игроки |
| **Админка** | `/admin/*` | SUPERADMIN |

## Карта страниц

```
/                          Главная: hero, фильтр региона, локальные турниры, клубы
/tournaments               Список турниров + фильтр страна/город
/tournaments/[id]          Карточка турнира: описание, участники, сетка
/tournaments/[id]/bracket  Публичная графическая сетка (без входа)
/clubs                     Список клубов + фильтр
/clubs/[id]                Клуб и его турниры
/players                   Рейтинг игроков + фильтр (бывший /rating)
/players/[id]              Публичный профиль игрока
/login                     Вход через Telegram
/cabinet                   Личный кабинет (профиль, регистрации)
/admin/*                   Управление (без изменений)
```

## Локальность (международность)

- Данные: `Country` → `City` → клубы, игроки, турниры.
- На главной и в списках — **фильтр страна / город** (`?countryId=&cityId=`).
- Если пользователь **залогинен** — по умолчанию подставляется его город.
- Тексты UI в `lib/site.ts` (`SITE_COPY`) — задел под i18n (сейчас RU).

## Дизайн-система

Токены и классы в `globals.css`:

- `site-hero-glow` — фон с зелёным свечением (войл)
- `site-card` / `site-card-interactive` — карточки
- `site-btn-primary|secondary|ghost` — кнопки
- `site-page-title`, `site-section-title`, `site-lead` — типографика
- `site-container` — max-width 5xl

Компоненты: `components/site/*` — header, footer, geo-filter, cards.

**Палитра:** тёмный фон (стол), emerald акцент, zinc нейтрали.

## Вход / выход

1. `/login` → телефон → Telegram «Подтвердить вход»
2. Cookie `setka_session` → доступ к `/cabinet` и `/admin` (если SUPERADMIN)
3. **Выход** — кнопка в шапке (`UserMenu` → DELETE `/api/auth/me`)

## Что только в админке

Создание клубов/игроков, регистрация на турнир, сетки, калькулятор форы — `/admin`.
