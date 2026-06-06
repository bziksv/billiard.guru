import type { BracketFormatCode } from "@/lib/bracket-formats/catalog";
import { buildFixedSwissTemplate } from "@/lib/fixed-swiss-grid";
import type { BracketMatchView, BracketTeamView } from "@/lib/bracket-view";
import {
  buildOlympicBracket,
  buildOlympicBracketWithBronze,
  isDynamicSwissFormat,
  isExcelRef64Format,
  isFixedSwissFormat,
  isOlympicBronzeFormat,
  isOlympicFormat,
} from "@/lib/pair-tournament";
import {
  getDefaultBracketParticipantRules,
  type BracketParticipantRules,
} from "@/lib/bracket-participant-rules";

const DEMO_SURNAMES = [
  "Иванов",
  "Петров",
  "Сидоров",
  "Козлов",
  "Новиков",
  "Морозов",
  "Волков",
  "Соколов",
  "Лебедев",
  "Кузнецов",
  "Попов",
  "Смирнов",
  "Васильев",
  "Павлов",
  "Семёнов",
  "Голубев",
  "Виноградов",
  "Богданов",
  "Воробьёв",
  "Фёдоров",
  "Михайлов",
  "Беляев",
  "Тарасов",
  "Белов",
  "Комаров",
  "Орлов",
  "Киселёв",
  "Макаров",
  "Андреев",
  "Ковалёв",
  "Ильин",
  "Гусев",
  "Титов",
  "Кузьмин",
  "Кудрявцев",
  "Баранов",
  "Куликов",
  "Алексеев",
  "Степанов",
  "Яковлев",
  "Сорокин",
  "Сергеев",
  "Романов",
  "Захаров",
  "Борисов",
  "Королёв",
  "Герасимов",
  "Пономарёв",
  "Григорьев",
  "Лазарев",
  "Медведев",
  "Ершов",
  "Никитин",
  "Соболев",
  "Рябов",
  "Поляков",
  "Цветков",
  "Данилов",
  "Жуков",
  "Фролов",
  "Журавлёв",
  "Николаев",
  "Крылов",
  "Максимов",
  "Сидоренко",
];

const DEMO_FIRST = [
  "И.",
  "П.",
  "С.",
  "К.",
  "А.",
  "М.",
  "В.",
  "Д.",
  "Е.",
  "Н.",
  "О.",
  "Р.",
  "Т.",
  "Л.",
  "Г.",
  "Б.",
];

function demoParticipantCount(rules: BracketParticipantRules): number {
  if (rules.exact != null) return rules.exact;
  if (rules.min >= 16 && rules.max >= 16) return 16;
  if (rules.max >= 8) return 8;
  return Math.max(rules.min, 4);
}

function mkSoloTeam(index: number): BracketTeamView {
  const id = `demo-t${index}`;
  return {
    id,
    name: null,
    player1: {
      id: `${id}-p1`,
      firstName: DEMO_FIRST[index % DEMO_FIRST.length]!,
      lastName: DEMO_SURNAMES[index % DEMO_SURNAMES.length]!,
      rating: Math.round((8.5 - index * 0.12) * 10) / 10,
    },
    player2: null,
  };
}

function mkPairTeam(index: number): BracketTeamView {
  const id = `demo-t${index}`;
  const i1 = index * 2;
  const i2 = index * 2 + 1;
  return {
    id,
    name: null,
    player1: {
      id: `${id}-p1`,
      firstName: DEMO_FIRST[i1 % DEMO_FIRST.length]!,
      lastName: DEMO_SURNAMES[i1 % DEMO_SURNAMES.length]!,
      rating: Math.round((7.5 - index * 0.08) * 10) / 10,
    },
    player2: {
      id: `${id}-p2`,
      firstName: DEMO_FIRST[i2 % DEMO_FIRST.length]!,
      lastName: DEMO_SURNAMES[i2 % DEMO_SURNAMES.length]!,
      rating: Math.round((7.0 - index * 0.08) * 10) / 10,
    },
  };
}

function mkDemoTeams(count: number, pairing: "single" | "pair"): BracketTeamView[] {
  const mk = pairing === "pair" ? mkPairTeam : mkSoloTeam;
  return Array.from({ length: count }, (_, i) => mk(i));
}

function inputToView(
  input: { round: number; slot: number; team1Id: string | null; team2Id: string | null },
  teamsById: Map<string, BracketTeamView>,
  idPrefix: string,
  completedRound1Slots: Set<number>,
): BracketMatchView {
  const team1 = input.team1Id ? teamsById.get(input.team1Id) ?? null : null;
  const team2 = input.team2Id ? teamsById.get(input.team2Id) ?? null : null;
  const completed =
    input.round === 1 &&
    completedRound1Slots.has(input.slot) &&
    team1 &&
    team2;

  return {
    id: `${idPrefix}-r${input.round}s${input.slot}`,
    round: input.round,
    slot: input.slot,
    status: completed ? "COMPLETED" : "SCHEDULED",
    team1,
    team2,
    winnerTeamId: completed ? team1.id : null,
    team1Score: completed ? 5 : null,
    team2Score: completed ? 3 : null,
  };
}

function buildOlympicDemo(
  format: string,
  count: number,
  pairing: "single" | "pair",
): BracketMatchView[] {
  const teams = mkDemoTeams(count, pairing);
  const teamIds = teams.map((t) => t.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const inputs = isOlympicBronzeFormat(format)
    ? buildOlympicBracketWithBronze(teamIds)
    : buildOlympicBracket(teamIds);

  const completedRound1Slots = new Set([1, 2]);
  return inputs.map((m) =>
    inputToView(m, teamsById, "demo-oly", completedRound1Slots),
  );
}

function buildFixedSwissDemo(
  format: string,
  count: number,
  pairing: "single" | "pair",
): BracketMatchView[] {
  const teams = mkDemoTeams(count, pairing);
  const teamIds = teams.map((t) => t.id);
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const template = buildFixedSwissTemplate(count, format);
  const round1Seed = buildOlympicBracket(teamIds);
  const round1BySlot = new Map(
    round1Seed.filter((m) => m.round === 1).map((m) => [m.slot, m]),
  );

  const completedRound1Slots = new Set([1, 2, 3]);
  return template.matches.map((m) => {
    const r1 = m.round === 1 ? round1BySlot.get(m.slot) : null;
    const input = {
      round: m.round,
      slot: m.slot,
      team1Id: r1?.team1Id ?? null,
      team2Id: r1?.team2Id ?? null,
    };
    return inputToView(input, teamsById, "demo-fs", completedRound1Slots);
  });
}

function buildDynamicSwissDemo(pairing: "single" | "pair"): BracketMatchView[] {
  const count = 8;
  const teams = mkDemoTeams(count, pairing);
  const matches: BracketMatchView[] = [];

  for (let slot = 1; slot <= count / 2; slot++) {
    const t1 = teams[(slot - 1) * 2]!;
    const t2 = teams[(slot - 1) * 2 + 1]!;
    const completed = slot <= 2;
    matches.push({
      id: `demo-sw-r1s${slot}`,
      round: 1,
      slot,
      status: completed ? "COMPLETED" : "SCHEDULED",
      team1: t1,
      team2: t2,
      winnerTeamId: completed ? t1.id : null,
      team1Score: completed ? 5 : null,
      team2Score: completed ? 2 : null,
    });
  }

  const round2Pairs: [number, number][] = [
    [0, 2],
    [1, 3],
    [4, 6],
    [5, 7],
  ];
  for (let slot = 1; slot <= 4; slot++) {
    const [a, b] = round2Pairs[slot - 1]!;
    matches.push({
      id: `demo-sw-r2s${slot}`,
      round: 2,
      slot,
      status: "SCHEDULED",
      team1: teams[a]!,
      team2: teams[b]!,
      winnerTeamId: null,
      team1Score: null,
      team2Score: null,
    });
  }

  return matches;
}

function buildExcelRef64Demo(pairing: "single" | "pair"): BracketMatchView[] {
  return buildFixedSwissDemo("FIXED_SWISS_64", 64, pairing);
}

/** Сетки 32/64 (и больше) — на лендинге показываем схему колонок, не полную сетку */
export const BRACKET_DEMO_STRUCTURE_THRESHOLD = 28;

export function isLargeBracketDemo(matches: BracketMatchView[]): boolean {
  return matches.length >= BRACKET_DEMO_STRUCTURE_THRESHOLD;
}

/** Демо-матчи для интерактивной схемы на SEO-лендинге */
export function buildBracketFormatDemo(
  format: BracketFormatCode,
  pairing: "single" | "pair",
): BracketMatchView[] {
  const rules = getDefaultBracketParticipantRules(format);
  const count = demoParticipantCount(rules);

  if (isExcelRef64Format(format)) {
    return buildExcelRef64Demo(pairing);
  }
  if (isFixedSwissFormat(format)) {
    return buildFixedSwissDemo(format, count, pairing);
  }
  if (isOlympicFormat(format)) {
    return buildOlympicDemo(format, count, pairing);
  }
  if (isDynamicSwissFormat(format)) {
    return buildDynamicSwissDemo(pairing);
  }

  return buildOlympicDemo(format, count, pairing);
}
