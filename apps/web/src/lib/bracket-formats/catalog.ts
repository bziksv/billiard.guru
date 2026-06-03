import {
  FIXED_SWISS_16_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32_FORMAT_LABEL,
  FIXED_SWISS_64_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_64_FORMAT_LABEL,
  OLYMPIC_1L_BRONZE_FORMAT_LABEL,
  OLYMPIC_SINGLE_FORMAT_LABEL,
  TOURNAMENT_FORMAT_LABELS,
} from "@/lib/validators";

/** Код формата = значение TournamentFormat в Prisma */
export type BracketFormatCode =
  | "OLYMPIC"
  | "OLYMPIC_1L_BRONZE"
  | "SWISS"
  | "FIXED_SWISS"
  | "FIXED_SWISS_16_BRONZE"
  | "FIXED_SWISS_32"
  | "FIXED_SWISS_32_BRONZE"
  | "FIXED_SWISS_64"
  | "FIXED_SWISS_64_BRONZE"
  | "PAIR_OLYMPIC"
  | "PAIR_OLYMPIC_1L_BRONZE"
  | "PAIR_SWISS"
  | "FIXED_PAIR_SWISS"
  | "FIXED_PAIR_SWISS_16_BRONZE"
  | "FIXED_PAIR_SWISS_32"
  | "FIXED_PAIR_SWISS_32_BRONZE"
  | "FIXED_PAIR_SWISS_64"
  | "FIXED_PAIR_SWISS_64_BRONZE";

export interface BracketFormatDefinition {
  code: BracketFormatCode;
  /** Подпись в списке форматов (как при создании турнира) */
  adminLabel: string;
  pairing: "single" | "pair";
  layout: "olympic" | "swiss_dynamic" | "swiss_fixed";
  /** Эталон отрисовки (16→8) */
  isReference?: boolean;
  shortDescription: string;
  /** id секции в tournament-brackets-guide (если есть) */
  guideSectionId?: string;
  docPaths?: string[];
  implementation: string[];
  testCommand?: string;
}

/**
 * Реестр типов сеток. Новый формат → запись здесь → появится в /admin/brackets и в FORMAT_OPTIONS.
 */
export const BRACKET_FORMAT_CATALOG: BracketFormatDefinition[] = [
  {
    code: "OLYMPIC",
    adminLabel: OLYMPIC_SINGLE_FORMAT_LABEL,
    pairing: "single",
    layout: "olympic",
    shortDescription: "Выбывание, сетка целиком после жеребьёвки.",
    guideSectionId: "olympic",
    implementation: [
      "bracket-service.ts — generateOlympicBracket",
      "olympic-bracket-view.tsx",
    ],
  },
  {
    code: "OLYMPIC_1L_BRONZE",
    adminLabel: OLYMPIC_1L_BRONZE_FORMAT_LABEL,
    pairing: "single",
    layout: "olympic",
    shortDescription:
      "Олимпийская сетка + матч проигравших полуфиналистов за 3-е и 4-е место.",
    guideSectionId: "olympic-bronze",
    implementation: [
      "pair-tournament.ts — buildOlympicBracketWithBronze",
      "bracket-service.ts — routeOlympicSemiLoserToBronze",
      "olympic-bracket-view.tsx",
    ],
  },
  {
    code: "SWISS",
    adminLabel: "Швейцарская (по турам, одиночный)",
    pairing: "single",
    layout: "swiss_dynamic",
    shortDescription: "Пары каждого тура формируются после завершения предыдущего.",
    guideSectionId: "swiss-dynamic",
    implementation: [
      "bracket-service.ts — generateSwissRound",
      "swiss-bracket-view.tsx",
    ],
  },
  {
    code: "FIXED_SWISS",
    adminLabel: TOURNAMENT_FORMAT_LABELS.FIXED_SWISS!,
    pairing: "single",
    layout: "swiss_fixed",
    isReference: true,
    shortDescription: "27 встреч, 7 колонок, фиксированные переходы win/loss (эталон 16→8).",
    guideSectionId: "swiss-fixed",
    docPaths: [
      "docs/BRACKET_REFERENCE_16_8.md",
      "docs/FIXED_SWISS_BRACKET_LINES.md",
    ],
    implementation: [
      "fixed-swiss-grid.ts — buildFixedSwissTsTemplate()",
      "fixed-swiss-layout.ts — Y, SVG, позиции",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_16_BRONZE",
    adminLabel: FIXED_SWISS_16_BRONZE_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "Эталон 16→8 (27 встреч) + матч проигравших полуфиналистов за 3–4 место (#28).",
    guideSectionId: "swiss-fixed-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: [
      "fixed-swiss-grid.ts — buildFixedSwissTsBronzeTemplate()",
      "fixed-swiss-layout.ts — buildTsPositions28Bronze",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_32",
    adminLabel: FIXED_SWISS_32_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    isReference: true,
    shortDescription:
      "59 встреч, 10 колонок — эталон LLB 32→16: #41–#44 1/8, #45–#48 тур 3, #49–#52 тур 4, 1/4 с #53.",
    guideSectionId: "swiss-fixed-32",
    docPaths: [
      "docs/BRACKET_REFERENCE_32_16.md",
      "docs/FIXED_SWISS_BRACKET_LINES_32_16.md",
    ],
    implementation: [
      "fixed-swiss-ts-grid.ts — buildFixedSwissTs32Template()",
      "fixed-swiss-layout.ts — buildTsPositions32",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_32_BRONZE",
    adminLabel: FIXED_SWISS_32_BRONZE_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "Эталон 32→16 (59 встреч) + #60 матч проигравших полуфиналистов; #60 под финалом в колонке «Финал».",
    guideSectionId: "swiss-fixed-32-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_32_16.md"],
    implementation: [
      "fixed-swiss-ts-grid.ts — buildFixedSwissTs32Template(withBronze)",
      "fixed-swiss-layout.ts — buildTsPositions32Bronze",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_64",
    adminLabel: FIXED_SWISS_64_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    isReference: true,
    shortDescription:
      "111 встреч, 10 колонок — эталон LLB 64→32: #81–#88 1/8, нижняя тур 1–4, 1/4 с #105.",
    guideSectionId: "swiss-fixed-64",
    docPaths: [
      "docs/BRACKET_REFERENCE_64_32.md",
      "docs/FIXED_SWISS_BRACKET_LINES_64_32.md",
    ],
    implementation: [
      "fixed-swiss-ts-grid.ts — buildFixedSwissTs64Template()",
      "fixed-swiss-layout.ts — buildTsPositions64",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_64_BRONZE",
    adminLabel: FIXED_SWISS_64_BRONZE_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "Эталон 64→32 (111 встреч) + #112 матч проигравших полуфиналистов; #112 под финалом в колонке «Финал».",
    guideSectionId: "swiss-fixed-64-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_64_32.md"],
    implementation: [
      "fixed-swiss-ts-grid.ts — buildFixedSwissTs64Template(withBronze)",
      "fixed-swiss-layout.ts — buildTsPositions64Bronze",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "PAIR_OLYMPIC",
    adminLabel: "Парный (фикс. сетка)",
    pairing: "pair",
    layout: "olympic",
    shortDescription: "Олимпийская сетка на команды из двух игроков.",
    guideSectionId: "pair-olympic",
    implementation: ["bracket-service.ts", "olympic-bracket-view.tsx"],
  },
  {
    code: "PAIR_OLYMPIC_1L_BRONZE",
    adminLabel: TOURNAMENT_FORMAT_LABELS.PAIR_OLYMPIC_1L_BRONZE!,
    pairing: "pair",
    layout: "olympic",
    shortDescription: "Парная олимпийская сетка + матч за 3–4 место.",
    guideSectionId: "olympic-bronze",
    implementation: ["bracket-service.ts", "olympic-bracket-view.tsx"],
  },
  {
    code: "PAIR_SWISS",
    adminLabel: "Парный швейцарская (по турам)",
    pairing: "pair",
    layout: "swiss_dynamic",
    shortDescription: "Швейцарка по турам для пар.",
    guideSectionId: "pair-swiss-dynamic",
    implementation: ["bracket-service.ts", "swiss-bracket-view.tsx"],
  },
  {
    code: "FIXED_PAIR_SWISS",
    adminLabel: TOURNAMENT_FORMAT_LABELS.FIXED_PAIR_SWISS!,
    pairing: "pair",
    layout: "swiss_fixed",
    shortDescription: "Парный аналог эталона FIXED_SWISS (16→8).",
    guideSectionId: "pair-swiss-fixed",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: [
      "fixed-swiss-grid.ts",
      "fixed-swiss-layout.ts",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_PAIR_SWISS_16_BRONZE",
    adminLabel: TOURNAMENT_FORMAT_LABELS.FIXED_PAIR_SWISS_16_BRONZE!,
    pairing: "pair",
    layout: "swiss_fixed",
    shortDescription: "Парный аналог FIXED_SWISS_16_BRONZE (28 встреч на 16 команд).",
    guideSectionId: "swiss-fixed-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: ["fixed-swiss-grid.ts", "fixed-swiss-layout.ts"],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_PAIR_SWISS_32",
    adminLabel: TOURNAMENT_FORMAT_LABELS.FIXED_PAIR_SWISS_32!,
    pairing: "pair",
    layout: "swiss_fixed",
    shortDescription: "Парный аналог FIXED_SWISS_32 (32→16).",
    guideSectionId: "pair-swiss-fixed-32",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: ["fixed-swiss-ts-grid.ts", "fixed-swiss-layout.ts"],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_PAIR_SWISS_32_BRONZE",
    adminLabel: TOURNAMENT_FORMAT_LABELS.FIXED_PAIR_SWISS_32_BRONZE!,
    pairing: "pair",
    layout: "swiss_fixed",
    shortDescription: "Парный аналог FIXED_SWISS_32_BRONZE (60 встреч на 32 команды).",
    guideSectionId: "swiss-fixed-32-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: ["fixed-swiss-ts-grid.ts", "fixed-swiss-layout.ts"],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_PAIR_SWISS_64",
    adminLabel: TOURNAMENT_FORMAT_LABELS.FIXED_PAIR_SWISS_64!,
    pairing: "pair",
    layout: "swiss_fixed",
    shortDescription: "Парный аналог FIXED_SWISS_64 (64→32).",
    guideSectionId: "pair-swiss-fixed-64",
    docPaths: ["docs/BRACKET_REFERENCE_64_32.md"],
    implementation: ["fixed-swiss-ts-grid.ts", "fixed-swiss-layout.ts"],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_PAIR_SWISS_64_BRONZE",
    adminLabel: TOURNAMENT_FORMAT_LABELS.FIXED_PAIR_SWISS_64_BRONZE!,
    pairing: "pair",
    layout: "swiss_fixed",
    shortDescription: "Парный аналог FIXED_SWISS_64_BRONZE (112 встреч на 64 команды).",
    guideSectionId: "swiss-fixed-64-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_64_32.md"],
    implementation: ["fixed-swiss-ts-grid.ts", "fixed-swiss-layout.ts"],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
];

const byCode = new Map(BRACKET_FORMAT_CATALOG.map((f) => [f.code, f]));

export function getBracketFormat(code: string): BracketFormatDefinition | undefined {
  return byCode.get(code as BracketFormatCode);
}

export function isBracketFormatCode(code: string): code is BracketFormatCode {
  return byCode.has(code as BracketFormatCode);
}

/** Для SearchableSelect при создании турнира */
export const FORMAT_OPTIONS = BRACKET_FORMAT_CATALOG.map((f) => ({
  value: f.code,
  label: f.adminLabel,
}));
