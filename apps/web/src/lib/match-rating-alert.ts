/** Показать alert, если PATCH матча вернул авторейтинг. */
export function alertMatchRatingChanges(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const changes = (data as { ratingChanges?: unknown }).ratingChanges;
  if (!Array.isArray(changes) || changes.length === 0) return;
  const lines = changes.map((raw) => {
    const c = raw as {
      name?: string;
      oldRating?: number;
      newRating?: number;
      delta?: number;
    };
    const delta = typeof c.delta === "number" ? c.delta : 0;
    const sign = delta > 0 ? "+" : "";
    return `${c.name ?? "?"}: ${c.oldRating} → ${c.newRating} (${sign}${delta})`;
  });
  alert(`Рейтинг обновлён:\n${lines.join("\n")}`);
}
