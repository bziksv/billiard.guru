/** Точные пути (list pages и home). */
export const EN_READY_EXACT = new Set<string>([
  "/",
  "/tournaments",
  "/clubs",
  "/players",
  "/coaches",
  "/rules",
  "/brackets",
  "/news",
  "/pokatat",
  "/ideas",
  "/cabinet",
]);

/** Префиксы detail-страниц в scope Phase 2–3. */
export const EN_READY_PREFIXES = [
  "/tournaments/",
  "/clubs/",
  "/players/",
  "/coaches/",
  "/rules/",
  "/brackets/",
  "/legal/",
  "/news/",
  "/pokatat/",
  "/cabinet/",
] as const;

export function isEnContentReady(pathname: string): boolean {
  const normalized = pathname === "" ? "/" : pathname;
  if (EN_READY_EXACT.has(normalized)) return true;
  return EN_READY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
