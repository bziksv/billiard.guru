# Версионность и логирование

## Внутренняя система версионности (обязательна)

### Семантическое версионирование

Формат: `MAJOR.MINOR.PATCH` (SemVer 2.0).

- **MAJOR** — несовместимые изменения API/схемы БД
- **MINOR** — новая функциональность, обратно совместимая
- **PATCH** — исправления без изменения контрактов

Версия хранится в `package.json` (корень монорепо) и дублируется в:

```json
{
  "version": "0.1.0",
  "build": {
    "commit": "<git-sha>",
    "builtAt": "<ISO8601>"
  }
}
```

### Changelog

- Файл `CHANGELOG.md` в корне — все релизы по [Keep a Changelog](https://keepachangelog.com/)
- Каждый PR с пользовательской фичей дополняет секцию `[Unreleased]`

### API-версионирование

- REST: префикс `/api/v1/...`
- Breaking change → новая версия `/api/v2/...`, старая поддерживается минимум один минорный релиз

### Audit log (бизнес-события)

Все значимые действия пишутся в таблицу `audit_log`:

| Поле | Описание |
|------|----------|
| `id` | UUID |
| `app_version` | версия приложения на момент события |
| `actor_id` | кто выполнил (user/system) |
| `action` | `tournament.create`, `match.result`, `bracket.update`, … |
| `entity_type` | `tournament`, `match`, `player`, … |
| `entity_id` | ID сущности |
| `payload` | JSON diff / snapshot |
| `created_at` | timestamp |

### Endpoint здоровья

```
GET /api/v1/health
→ { "status": "ok", "version": "0.1.0", "commit": "abc123" }
```

## Логирование

### Библиотека

- **Pino** (Node.js) — structured JSON logs
- Dev: `pino-pretty` для читаемого вывода

### Обязательные поля каждой записи

```json
{
  "timestamp": "2026-05-30T12:00:00.000Z",
  "level": "info",
  "service": "setka-api",
  "version": "0.1.0",
  "requestId": "uuid",
  "message": "Match result recorded",
  "context": {
    "tournamentId": "...",
    "matchId": "..."
  }
}
```

### Корреляция

- `requestId` — генерируется на входе, пробрасывается в заголовке `X-Request-Id`
- Один `requestId` на цепочку HTTP → DB → WebSocket

### Хранение

| Окружение | Куда |
|-----------|------|
| local     | stdout |
| staging/prod | stdout → агрегатор (Loki / Datadog / CloudWatch) |

### Что логировать

| Уровень | Примеры |
|---------|---------|
| `info`  | старт сервиса, создание турнира, регистрация |
| `warn`  | повторная регистрация, deprecated API |
| `error` | падение запроса, ошибка БД |
| `debug` | только local/staging |

### Что не логировать

- Пароли, токены, полные JWT
- Персональные данные сверх необходимого (PII minimization)
