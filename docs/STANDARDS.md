# Стандарты проекта billiard.guru

## Порт

- **Dev и локальный запуск: `3010`**
- Не менять без обновления этого документа и `docker-compose.yml`
- Переменная окружения: `PORT=3010`

## Документация

Каждый модуль и значимая фича должны иметь:

1. **README** в папке модуля — назначение, запуск, env-переменные
2. **ADR** (Architecture Decision Record) при архитектурных решениях — в `docs/adr/`
3. **API-контракт** — OpenAPI/Swagger или описание в `docs/api/`

Документация пишется на русском, технические термины — на английском где принято (bracket, seeding).

## Правила разработки

### Код

- TypeScript strict mode
- ESLint + Prettier — форматирование перед коммитом
- Именование: `kebab-case` для файлов, `PascalCase` для компонентов, `camelCase` для функций
- Коммиты: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`)

### Git

- `main` — стабильная ветка
- `feature/*`, `fix/*` — рабочие ветки
- PR обязателен для merge в `main`

### UI / формы

- **Все поля выбора — с поиском.** Использовать `SearchableSelect` (`src/components/ui/searchable-select.tsx`), не `<select>`
- Для страны/города — `CitySelect`
- Для телефона — `PhoneInput` (код страны автоматически, см. `.cursor/rules/phone-validation.mdc`)
- См. `.cursor/rules/searchable-selects.mdc`

### Dev-сервер

- Агент **самостоятельно перезапускает** `npm run dev` в `apps/web` (порт 3010), если менялись `.env`, Prisma, зависимости, API или server code
- Не просить пользователя перезапустить вручную — см. `.cursor/rules/dev-server-restart.mdc`

### Безопасность

- Секреты только в `.env` (не коммитить)
- `.env.example` — шаблон без значений
- Валидация входных данных на API (Zod / class-validator)

### Тесты

- Unit-тесты для бизнес-логики (сетки, посев, подсчёт очков)
- E2E для критичных сценариев: создание турнира → регистрация → результат

## Логирование

Обязательна централизованная система логов. Подробности — [VERSIONING.md](VERSIONING.md).

- Уровни: `debug`, `info`, `warn`, `error`
- Каждый лог содержит: `timestamp`, `level`, `service`, `version`, `requestId`, `message`
- Ошибки — со stack trace в dev, без чувствительных данных в prod

## Окружения

| Окружение | Порт | Назначение |
|-----------|------|------------|
| local     | 3010 | разработка |
| staging   | 3010 | предпрод |
| production| 80/443 | прод (за reverse proxy) |
