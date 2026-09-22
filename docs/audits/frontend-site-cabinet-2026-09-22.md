# Frontend audit: public site + cabinet

**Date:** 2026-09-22  
**Scope:** `(site)` public pages + `/cabinet` (phase 1).  
**Out of scope:** `/manage`, `/admin` (phases 2–3).  
**Method:** code review + HTTP smoke on `localhost:3010`.  
**Fixes:** applied 2026-09-22 (see changelog below).

## Smoke (localhost:3010)

| URL | Result |
|-----|--------|
| `/`, `/tournaments`, `/clubs`, `/players`, `/coaches`, `/news`, `/pokatat`, `/ideas`, `/rules`, `/brackets`, `/legal/*`, `/login` | **200** |
| `/tournaments/[id]`, `/tournaments/[id]/bracket` (sample) | **200** |
| `/en/`, `/en/tournaments` | **200** / locale OK |
| `/cabinet` (anon) | **307** → `/login?next=/cabinet` |
| `/cabinet/club` (anon) | **307** → login (layout gate) |
| `/rating` | **307** → `/players` (expected) |
| `POST /api/analytics/pageview` MARKETING without consent cookie | **204**, no record |
| Home stats (`loadHomeStats`) | tournaments/clubs/players from DB (OK) |

## Summary table

| ID | Severity | Area | Finding | Status |
|----|----------|------|---------|--------|
| F1 | **High** | Auth | Open redirect via `?next=` | **fixed** — [`safe-internal-path.ts`](../../apps/web/src/lib/safe-internal-path.ts) + login |
| F2 | **Medium** | Privacy | Pageview API without consent | **fixed** — cookie `setka_cookie_consent` + API gate |
| F3 | **Medium** | Privacy/UX | Beacon after Accept | **fixed** — `COOKIE_CONSENT_EVENT` |
| F4 | **Medium** | i18n | RU hardcodes on EN | **fixed** — auth, pokatat, clubMap, bracket labels |
| F5 | **Medium** | i18n | Home news RU on EN | **ok** — already filtered via `newsHasEnTranslation` |
| F6 | **Medium** | Cabinet | External gallery URLs | **fixed** — only `/uploads/coaches/` |
| F7 | **Medium** | UX | fetch without try/catch | **fixed** — cabinet editors, register, booking, ideas, pokatat |
| F8 | **Low** | Auth | Cabinet layout pass-through | **fixed** — session gate in layout |
| F9 | **Low** | UX | Hero counters at 0 | **fixed** — SSR initial value + softer observer |
| F10 | **Low** | Forms | Client validation gaps | **fixed** — booking maxLength, login disable, pokatat recurring |
| F11 | **Low** | Cabinet | Coach upload without isCoach | **fixed** — API requires `isCoach` |
| F12 | **Low** | i18n | Login router locale | **fixed** — `@/i18n/navigation` |
| F13–F17 | Info | — | Positives / keep as-is | no change |

## Changelog (fixes)

- `lib/safe-internal-path.ts` — allowlist post-login paths.
- Cookie consent: readable cookie + server check; beacon re-fires on Accept.
- i18n: `openBotStep`, `clubMap`, pokatat client strings; bracket substitution labels; stream link.
- Coach gallery Zod + photo upload gate.
- Cabinet layout auth; HomeStatCounter; form hardening; fetch try/catch.

## Next phases

- **Phase 2:** `/manage` — **done** → [`manage-2026-09-22.md`](./manage-2026-09-22.md) (P0–P3 fixed).
- **Phase 3:** `/admin` — **done** → [`admin-2026-09-22.md`](./admin-2026-09-22.md) (A-P1/E1/L1 fixed).

Security-очереди site / manage / admin **закрыты**.
