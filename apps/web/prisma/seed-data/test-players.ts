/** Тестовые игроки Тест1 … Тест300 */

export function testPlayerPhone(i: number): string {
  return `+7900000${String(i).padStart(5, "0")}`;
}

/** Рейтинг 0 … max, шаг 0,5 (случайно). */
export function randomTestPlayerRating(max = 8): number {
  const steps = Math.round(max * 2) + 1;
  return Math.floor(Math.random() * steps) * 0.5;
}
