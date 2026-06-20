import type { BilliardGame, BilliardHistory, BilliardTableType } from "@/lib/billiard-rules/content";

/** Подмешивает исторические блоки в тип стола и дисциплины. */
export function withBilliardHistory(
  table: BilliardTableType,
  tableHistory: BilliardHistory,
  gameHistories: Record<string, BilliardHistory>,
): BilliardTableType {
  return {
    ...table,
    history: tableHistory,
    games: table.games.map((game) => ({
      ...game,
      history: gameHistories[game.slug],
    })),
  };
}

export function withGameHistories(
  games: BilliardGame[],
  gameHistories: Record<string, BilliardHistory>,
): BilliardGame[] {
  return games.map((game) => ({
    ...game,
    history: gameHistories[game.slug],
  }));
}
