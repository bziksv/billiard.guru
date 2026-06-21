/**
 * npx tsx scripts/debug-tournament-layout.ts <tournamentId>
 */
import { prisma } from "@/lib/prisma";
import { buildFixedSwissBracketLayout } from "@/lib/fixed-swiss-layout";
import type { BracketMatchView } from "@/lib/bracket-view";
import { teamLabel } from "@/lib/pair-tournament";

const tournamentId = process.argv[2];
if (!tournamentId) {
  console.error("Usage: npx tsx scripts/debug-tournament-layout.ts <tournamentId>");
  process.exit(1);
}

function toView(
  matches: Awaited<
    ReturnType<
      typeof prisma.tournamentMatch.findMany<{
        include: {
          team1: { include: { player1: true; player2: true } };
          team2: { include: { player1: true; player2: true } };
          winnerTeam: true;
        };
      }>
    >
  >,
): BracketMatchView[] {
  return matches.map((m) => ({
    id: m.id,
    round: m.round,
    slot: m.slot,
    status: m.status,
    team1: m.team1,
    team2: m.team2,
    winnerTeamId: m.winnerTeam?.id ?? null,
    team1Score: m.team1Score,
    team2Score: m.team2Score,
    startedAt: m.startedAt?.toISOString() ?? null,
    finishedAt: m.finishedAt?.toISOString() ?? null,
    tableId: m.tableId,
    streamUrl: null,
    tableLabel: null,
  }));
}

async function main() {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      matches: {
        orderBy: [{ round: "asc" }, { slot: "asc" }],
        include: {
          team1: { include: { player1: true, player2: true } },
          team2: { include: { player1: true, player2: true } },
          winnerTeam: true,
        },
      },
    },
  });
  if (!t) {
    console.error("not found");
    process.exit(1);
  }

  const view = toView(t.matches);
  const layout = buildFixedSwissBracketLayout(view);

  const rows = [...layout.matchNumbers.entries()]
    .map(([id, no]) => {
      const m = view.find((x) => x.id === id);
      const pos = layout.positions.get(id);
      const h = layout.cardHeights?.get(id) ?? 0;
      if (!m || !pos) return null;
      const bye = m.team1 && !m.team2 ? "bye" : !m.team1 && m.team2 ? "bye" : "full";
      return {
        no,
        round: m.round,
        slot: m.slot,
        col: pos.col,
        y: Math.round(pos.y),
        h,
        status: m.status,
        bye,
        label: m.team1 ? teamLabel(m.team1) : m.team2 ? teamLabel(m.team2) : "?",
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.no - b!.no);

  console.log(t.format, t.matches.length, "matches\n");

  for (const row of rows.filter((r) => r!.no >= 5 && r!.no <= 12)) {
    console.log(row);
  }

  const byCol = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = byCol.get(row!.col) ?? [];
    list.push(row);
    byCol.set(row!.col, list);
  }

  for (const [col, items] of byCol) {
    const sorted = [...items].sort((a, b) => a!.y - b!.y);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const curr = sorted[i]!;
      const bottom = prev.y + prev.h;
      if (curr.y < bottom - 0.5) {
        console.log(
          `\nOVERLAP col ${col}: #${prev.no} (y=${prev.y} h=${prev.h}) -> #${curr.no} (y=${curr.y}) gap=${curr.y - bottom}`,
        );
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
