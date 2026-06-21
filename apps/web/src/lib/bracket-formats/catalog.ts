import {
  FIXED_SWISS_8_4_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_16_8_FORMAT_LABEL,
  FIXED_SWISS_16_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_16R2_1_3_mesto_FORMAT_LABEL,
  FIXED_SWISS_32_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32_FORMAT_LABEL,
  FIXED_SWISS_32R8_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32R8_1_3_mesto_FORMAT_LABEL,
  FIXED_SWISS_32R8_FORMAT_LABEL,
  FIXED_SWISS_64R8_FORMAT_LABEL,
  FIXED_SWISS_64R8_1_3_mesto_FORMAT_LABEL,
  FIXED_SWISS_128R8_FORMAT_LABEL,
  FIXED_SWISS_128R8_1_3_mesto_FORMAT_LABEL,
  FIXED_SWISS_256R8_1_3_mesto_FORMAT_LABEL,
  OLYMPIC_1L_BRONZE_FORMAT_LABEL,
  OLYMPIC_SINGLE_FORMAT_LABEL,
} from "@/lib/validators";

/** Код формата из активного каталога (подмножество TournamentFormat в Prisma). */
export type BracketFormatCode =
  | "OLYMPIC"
  | "OLYMPIC_1L_BRONZE"
  | "FIXED_SWISS_8R4_1_3_mesto"
  | "FIXED_SWISS_16R4_2_3_mesta"
  | "FIXED_SWISS_16R4_1_3_mesto"
  | "FIXED_SWISS_16R2_1_3_mesto"
  | "FIXED_SWISS_32R4_2_3_mesta"
  | "FIXED_SWISS_32R4_1_3_mesto"
  | "FIXED_SWISS_32R8_2_3_mesta"
  | "FIXED_SWISS_32R8_1_3_mesto"
  | "FIXED_SWISS_32R8_BRONZE"
  | "FIXED_SWISS_64R8_2_3_mesta"
  | "FIXED_SWISS_64R8_1_3_mesto"
  | "FIXED_SWISS_128R8_2_3_mesta"
  | "FIXED_SWISS_128R8_1_3_mesto"
  | "FIXED_SWISS_256R8_1_3_mesto";

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

const TS32_R8_IMPL = [
  "fixed-swiss-ts-grid.ts — buildFixedSwissTs32Template()",
  "fixed-swiss-layout.ts — buildTsPositions32",
  "swiss-bracket-view.tsx",
] as const;

const TS32_R8_BRONZE_IMPL = [
  "fixed-swiss-ts-grid.ts — buildFixedSwissTs32Template(withBronze)",
  "fixed-swiss-layout.ts — buildTsPositions32Bronze",
  "swiss-bracket-view.tsx",
] as const;

const TS32_R8_ELIM_BRONZE_IMPL = [
  "fixed-swiss-ts-grid.ts — buildFixedSwissTs32R8ElimAtEighthBronzeTemplate()",
  "fixed-swiss-layout.ts — buildTsPositions32R8ElimAtEighthBronze",
  "swiss-bracket-view.tsx",
] as const;

const TS64_R8_ELIM_IMPL = [
  "fixed-swiss-ts-grid.ts — buildFixedSwissTs64R8ElimAtEighthTemplate()",
  "fixed-swiss-layout.ts — buildTsPositions64R8ElimAtEighth",
  "swiss-bracket-view.tsx",
] as const;

const TS64_R8_ELIM_BRONZE_IMPL = [
  "fixed-swiss-ts-grid.ts — buildFixedSwissTs64R8ElimAtEighthBronzeTemplate()",
  "fixed-swiss-layout.ts — buildTsPositions64R8ElimAtEighthBronze",
  "swiss-bracket-view.tsx",
] as const;

const TS128_R8_ELIM_IMPL = [
  "fixed-swiss-ts-grid.ts — buildFixedSwissTs128R8ElimAtEighthTemplate()",
  "fixed-swiss-layout.ts — buildTsPositionsLargeR8ElimAtEighth(half2=64)",
  "swiss-bracket-view.tsx",
] as const;

const TS128_R8_ELIM_BRONZE_IMPL = [
  "fixed-swiss-ts-grid.ts — buildFixedSwissTs128R8ElimAtEighthBronzeTemplate()",
  "fixed-swiss-layout.ts — buildTsPositionsLargeR8ElimAtEighthBronze",
  "swiss-bracket-view.tsx",
] as const;

const TS256_R8_ELIM_BRONZE_IMPL = [
  "fixed-swiss-ts-256r8-grid.ts — buildFixedSwissTs256R8ElimAtEighthBronzeTemplate()",
  "fixed-swiss-layout.ts — buildTsPositionsLargeR8ElimAtEighth(half2=128)",
  "swiss-bracket-view.tsx",
] as const;

export const BRACKET_FORMAT_CATALOG: BracketFormatDefinition[] = [
  {
    code: "OLYMPIC",
    adminLabel: OLYMPIC_SINGLE_FORMAT_LABEL,
    pairing: "single",
    layout: "olympic",
    shortDescription: "Выбывание после 1 поражения; проигравшие полуфиналисты делят 3-е место без доп. игры.",
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
      "Та же oлимпийская сетка, что у варианта «с двумя 3 местами», плюс матч проигравших полуфиналистов за 3–4 место.",
    guideSectionId: "olympic-bronze",
    implementation: [
      "pair-tournament.ts — buildOlympicBracketWithBronze",
      "bracket-service.ts — routeOlympicSemiLoserToBronze",
      "olympic-bracket-view.tsx",
    ],
  },
  {
    code: "FIXED_SWISS_8R4_1_3_mesto",
    adminLabel: FIXED_SWISS_8_4_BRONZE_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    isReference: true,
    shortDescription:
      "Копия 16R4_1_3 на 8 участников — 14 встреч (13 + #14 за 3–4), олимпийка с 1/4.",
    guideSectionId: "swiss-fixed-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: [
      "fixed-swiss-ts-grid.ts — buildFixedSwissTsTemplateForGridSize(8, true)",
      "fixed-swiss-layout.ts — buildTsPositionsBronzeForHalf2(half2=4)",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_16R4_2_3_mesta",
    adminLabel: FIXED_SWISS_16_8_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    isReference: true,
    shortDescription:
      "Копия FIXED_SWISS (27 встреч) — та же сетка 16→8, oлимпийka с 1/4, проигравшие полуфиналисты делят 3-е место без доп. игры.",
    guideSectionId: "swiss-fixed",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: [
      "fixed-swiss-ts-grid.ts — buildFixedSwissTsTemplateForGridSize(16, false)",
      "fixed-swiss-layout.ts — buildTsPositions16",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_16R4_1_3_mesto",
    adminLabel: FIXED_SWISS_16_BRONZE_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    isReference: true,
    shortDescription:
      "Копия FIXED_SWISS_16_BRONZE (28 встреч) — та же сетка 16→8, oлимпийka с 1/4 + матч #28 за 3–4.",
    guideSectionId: "swiss-fixed-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: [
      "fixed-swiss-ts-grid.ts — buildFixedSwissTsTemplateForGridSize(16, true)",
      "fixed-swiss-layout.ts — buildTsPositions16Bronze",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_16R2_1_3_mesto",
    adminLabel: FIXED_SWISS_16R2_1_3_mesto_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "30 встреч, 9 колонок — нижний тур 4 (#25–#26), полуфинал #27–#28, финал #29, доп. #30 за 3–4.",
    guideSectionId: "swiss-fixed-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_16_8.md"],
    implementation: [
      "fixed-swiss-ts-grid.ts — buildFixedSwissTs16R2ElimAtSemiBronzeTemplate",
      "fixed-swiss-layout.ts — buildTsPositions16R2ElimAtSemiBronze",
      "swiss-bracket-view.tsx",
    ],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_32R4_2_3_mesta",
    adminLabel: FIXED_SWISS_32_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    isReference: true,
    shortDescription:
      "Копия FIXED_SWISS_32R8_2_3_mesta (59 встреч) — та же сетка, подпись «олимпийка с 1/4», проигравшие полуфиналисты делят 3-е место.",
    guideSectionId: "swiss-fixed-32",
    docPaths: [
      "docs/BRACKET_REFERENCE_32_16.md",
      "docs/FIXED_SWISS_BRACKET_LINES_32_16.md",
    ],
    implementation: [...TS32_R8_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_32R4_1_3_mesto",
    adminLabel: FIXED_SWISS_32_BRONZE_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    isReference: true,
    shortDescription:
      "Копия FIXED_SWISS_32R8_BRONZE (60 встреч) — та же сетка, подпись «1/4 + доп.игра», #60 под финалом.",
    guideSectionId: "swiss-fixed-32-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_32_16.md"],
    implementation: [...TS32_R8_BRONZE_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_32R8_2_3_mesta",
    adminLabel: FIXED_SWISS_32R8_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "55 встреч, 9 колонок — олимпийка с 1/8 (#41–#44): проигравшие сразу на места 9–12, без #49–#52; полуфиналисты делят 3-е.",
    guideSectionId: "swiss-fixed-32-r8",
    docPaths: [
      "docs/BRACKET_REFERENCE_32_16.md",
      "docs/FIXED_SWISS_BRACKET_LINES_32_16.md",
    ],
    implementation: [...TS32_R8_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_32R8_1_3_mesto",
    adminLabel: FIXED_SWISS_32R8_1_3_mesto_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "56 встреч — копия R8_2_3_mesta (55) + #60: матч проигравших полуфиналистов под финалом.",
    guideSectionId: "swiss-fixed-32-r8-1-3",
    docPaths: [
      "docs/BRACKET_REFERENCE_32_16.md",
      "docs/FIXED_SWISS_BRACKET_LINES_32_16.md",
    ],
    implementation: [...TS32_R8_ELIM_BRONZE_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_32R8_BRONZE",
    adminLabel: FIXED_SWISS_32R8_BRONZE_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "60 встреч — олимпийка с 1/8 (59) + #60, матч проигравших полуфиналистов под финалом.",
    guideSectionId: "swiss-fixed-32-r8-bronze",
    docPaths: ["docs/BRACKET_REFERENCE_32_16.md"],
    implementation: [...TS32_R8_BRONZE_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_64R8_2_3_mesta",
    adminLabel: FIXED_SWISS_64R8_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "111 встреч, 11 колонок — олимпийка с 1/8 (#81–#88): проигравшие сразу на места 17–24, без нижней тур 4; полуфиналисты делят 3-е.",
    guideSectionId: "swiss-fixed-64-r8",
    docPaths: ["docs/BRACKET_REFERENCE_64_32.md"],
    implementation: [...TS64_R8_ELIM_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_64R8_1_3_mesto",
    adminLabel: FIXED_SWISS_64R8_1_3_mesto_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "112 встреч — копия R8 elim (111) + #120: матч проигравших полуфиналистов под финалом; вылет с 1/8 (#81–#88) на места 17–24.",
    guideSectionId: "swiss-fixed-64-r8-1-3",
    docPaths: ["docs/BRACKET_REFERENCE_64_32.md"],
    implementation: [...TS64_R8_ELIM_BRONZE_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_128R8_2_3_mesta",
    adminLabel: FIXED_SWISS_128R8_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "215 встреч — олимпийка с 1/8: проигравшие сразу на места 33–48, без нижней тур 4; полуфиналисты делят 3-е.",
    guideSectionId: "swiss-fixed-128-r8",
    implementation: [...TS128_R8_ELIM_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_128R8_1_3_mesto",
    adminLabel: FIXED_SWISS_128R8_1_3_mesto_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "216 встреч — копия R8 elim (215) + #248: матч проигравших полуфиналистов под финалом; вылет с 1/8 на места 33–48.",
    guideSectionId: "swiss-fixed-128-r8-1-3",
    implementation: [...TS128_R8_ELIM_BRONZE_IMPL],
    testCommand: "cd apps/web && npx tsx scripts/test-fixed-swiss-layout.ts",
  },
  {
    code: "FIXED_SWISS_256R8_1_3_mesto",
    adminLabel: FIXED_SWISS_256R8_1_3_mesto_FORMAT_LABEL,
    pairing: "single",
    layout: "swiss_fixed",
    shortDescription:
      "456 встреч — oлимпийka с 1/16, #456 бронза под финалом; 5 нижних туров.",
    guideSectionId: "swiss-fixed-256-r8-1-3",
    docPaths: ["docs/FIXED_SWISS_128R8_1_3_mesto.md"],
    implementation: [...TS256_R8_ELIM_BRONZE_IMPL],
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
