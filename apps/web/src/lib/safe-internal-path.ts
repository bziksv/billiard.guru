/**
 * Safe post-login redirect target: same-origin relative path only.
 * Rejects protocol-relative (`//evil.com`), absolute URLs, backslash tricks, etc.
 */
export function safeInternalPath(
  next: string | null | undefined,
  fallback = "/cabinet",
): string {
  if (!next || typeof next !== "string") return fallback;

  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  // Control chars / whitespace inside path (e.g. /\tevil)
  if (/[\u0000-\u001f\u007f\s]/.test(trimmed)) return fallback;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return fallback;

  // Block encoded tricks that decode to // or protocol
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded.startsWith("//") || decoded.includes("\\")) return fallback;
    if (/[\u0000-\u001f\u007f\s]/.test(decoded)) return fallback;
    if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return fallback;
  } catch {
    return fallback;
  }

  return trimmed;
}

/** Post-login destination: non-admins never land on /admin*. */
export function resolvePostLoginPath(
  next: string | null | undefined,
  options: { role?: string | null; fallback?: string } = {},
): string {
  const fallback = options.fallback ?? "/cabinet";
  const path = safeInternalPath(next, fallback);
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  if (isAdminPath && options.role !== "SUPERADMIN") {
    return fallback;
  }
  return path;
}
