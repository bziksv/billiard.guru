# Full project audit — pass 2

**Date:** 2026-09-22 (вечер)  
**Статус очереди:** аудит выполнен; Critical/High/Medium **и остаток A2/J1** починены.

## Как читать «14 пунктов»

Todos в плане `full_project_audit` = **пройти чеклист A–K** (найти дыры).  
Они все **completed** = аудит закончен, не «все баги в мире закрыты».

Дальше отдельно: **«исправляй»** / **«прорабатывай»** → фиксы по находкам.

## Регрессия (предыдущий проход) — OK

players/tournaments 401, clubs без token, health/db чистый, admin/manage/cabinet gate, safeInternalPath.

## Находки pass2 → статус после фиксов

- **F0-1** rating GET PII+token — Critical → **Fixed** (SA only + sanitize)
- **F0-2** rating POST без auth — Critical → **Fixed** (SA only)
- **A1** confirmLink в auth/start — Critical → **Fixed** (link не отдаётся)
- **G4** ATO через утёкший token — High → **Mitigated** (утечки закрыты + ротация tokens)
- **F0-6 / C2 / D3** preview write gaps — Medium → **Fixed** (assertNotPreviewWrite)
- **F0-3** health tournaments `node` — Low → **Fixed**
- **A2** mode register vs login — Medium → **Fixed** (`mode: "continue"` + фиксированные ключи; клиент ветвится по `challengeToken` / `openTelegram` / `needsProfile`)
- **J1** beget-setup echo DATABASE_URL — Low → **Fixed** (не печатаем `.env`)
- **G1** TG webhook без secret в dev — Info → OK as designed

## Что делать дальше

По аудиту security — **очередь пустая**.

Новый полный аудит не нужен, пока не будут крупные фичи.
