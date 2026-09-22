# Full project security audit

**Date:** 2026-09-22  
**Scope:** site+cabinet regression, `/manage`, `/admin`, API/auth, Telegram/Novofon webhooks.  
**Method:** code review + live HTTP probes on `localhost:3010`.  
**Fixes:** Critical/High/Medium applied 2026-09-22 (see status columns). Residual: none from this audit queue.

## P0 regression (site + cabinet F1–F12)

| Check | Result |
|-------|--------|
| `resolvePostLoginPath("//evil.com")` / `https://…` | → `/cabinet` |
| Encoded `/%2f%2fevil.com`, `///evil.com` | → `/cabinet` |
| MARKETING pageview without consent cookie | **204**, no `Set-Cookie` |
| `/cabinet`, `/cabinet/club` anon | **307** → `/login?next=/cabinet` |
| `/manage`, `/admin` anon | **307** → login |
| `/en/login` «Откройте» | absent |
| Gallery Zod `/uploads/coaches/` only | still in place |

Phase-1 fixes hold. Residual: `/\tevil` still passes as “safe” path (Low — exotic).

## Critical (live-confirmed)

| ID | Finding | Status | Fix |
|----|---------|--------|-----|
| **C1** | `GET /api/players` unauthenticated dumps PII + `confirmToken` | **Fixed** | `requirePlayersDirectoryAccess` + `sanitizePlayer` |
| **C2** | `GET /api/clubs` same | **Fixed** | Public list DTO (`toPublicClubListItem`); SA gets `sanitizeClub`; POST → `requireSuperAdmin` |
| **C3** | `GET /api/tournaments` embeds players with tokens | **Fixed** | Directory gate + `sanitizeTournamentListPayload` |
| **C4** | Confirm by leaked `confirm_<token>` | **Mitigated** | Stopped public leaks; rotated 59 unverified player tokens; cleared tokens on verified |
| **C5** | Club ATO via public POST + confirmLink | **Fixed** | POST clubs requires SUPERADMIN; responses sanitize; confirm regenerate owner-only |
| **C6** | Preview `/api/auth/me` reissues session as impersonated role | **Fixed** | Cookie refresh from `getRealPlayer()` only; `realRole`/`preview` in payload |

## High

| ID | Finding | Status | Fix |
|----|---------|--------|-----|
| **H1** | Telegram webhook secret optional | **Fixed** | Fail-closed in prod / `REQUIRE_WEBHOOK_SECRETS=1` |
| **H2** | Novofon webhook same | **Fixed** | Same fail-closed in `verifyNovofonWebhookRequest` |
| **H3** | `requireSuperAdmin` trusted JWT role | **Fixed** | DB role via `getRealPlayer()` |
| **H4** | Staff could regenerate club confirm | **Fixed** | Owner-only (+ SA) in `clubs/[id]/confirm` |
| **H5** | Preview is full write-as-user | **Fixed** | `assertNotPreviewWrite` / `requireWritablePlayer`; manage GET uses `readOnly` |
| **H6** | Unauth `POST /api/players` returned confirmLink | **Fixed** | Directory gate; `confirmLink` only for SUPERADMIN |
| **H7** | `GET /api/clubs/[id]` full club + all news | **Fixed** | Manage vs `toPublicClubDetail` (APPROVED news, no secrets) |

## Medium

| ID | Finding | Status | Notes |
|----|---------|--------|-------|
| **M1** | Flat staff ≈ owner | **Fixed** | Staff blocked from name/city/email/phone; confirm/staff already owner-only |
| **M2** | Club `galleryUrls` allowlist | **Fixed** | `/uploads/clubs/` in `club-photos.ts` |
| **M3** | Auth phone enumerates modes | **Fixed** | Unified continue message + timing pad |
| **M4** | No rate limit on auth | **Fixed** | In-memory limit on start/complete/start-call/login |
| **M5** | Impersonation cookies unsigned | **Fixed** | HMAC preview cookies bound to admin player id |
| **M6** | Fuzzy phone on TG contact | **Fixed** | Exact E.164 via `phonesMatchExactE164` |
| **M7** | Health DB hostname leak | **Fixed** | `{ status, db }` only — no host/error text |

## Low / Info

| ID | Finding | Notes |
|----|---------|-------|
| **L1** | `safeInternalPath` allows `/\t…` odd paths | **Fixed** — reject control/whitespace in path |
| **L2** | Db-backup `id` allowlisted `[\w-]+`; download gated `requireSuperAdmin` | OK |
| **L3** | Cron backup: secret required or SA | OK if `DB_BACKUP_CRON_SECRET` set |
| **L4** | Manage pages all call `requireClubOwnerPageAccess` | OK for page gate |
| **L5** | Tournament mutations use `requireTournamentManageAccess` | Write IDOR OK |
| **I1** | CSRF: SameSite=lax session | Acceptable for cookie+JSON |
| **I2** | Admin layout SUPERADMIN via DB | Pages OK; APIs H3 fixed |

## Smoke (post-fix, anon)

| Request | Result |
|---------|--------|
| `GET /api/players` | **401** |
| `GET /api/tournaments` | **401** |
| `GET /api/clubs` | **200**, public fields only, no `confirmToken` |
| `GET /api/clubs/[id]` | **200**, no phone/token |
| `POST /api/clubs` / `POST /api/players` | **401** |
| `GET /api/v1/health/db` | `{ status, db }` — no host |

## Positive

- Manage club pages consistently gated.
- Bracket/tournament write paths authz’d.
- Site+cabinet fixes from earlier audit still effective.
- Backup download path traversal blocked by id regex.

## Next

Очередь аудита закрыта. Дальше — только новые находки или продуктовые задачи.
