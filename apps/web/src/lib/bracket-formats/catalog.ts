import {
  FIXED_SWISS_32_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32_FORMAT_LABEL,
  FIXED_SWISS_32R8_BRONZE_FORMAT_LABEL,
  FIXED_SWISS_32R8_1_3_mesto_FORMAT_LABEL,
  FIXED_SWISS_32R8_FORMAT_LABEL,
  OLYMPIC_1L_BRONZE_FORMAT_LABEL,
  OLYMPIC_SINGLE_FORMAT_LABEL,
} from "@/lib/validators";

/** Код формата из активного каталога (подмножество TournamentFormat в Prisma). */
export type BracketFormatCode =
  | "OLYMPIC"
  | "OLYMPIC_1L_BRONZE"
  | "FIXED_SWISS_32R4_2_3_mesta"
  | "FIXED_SWISS_32R4_1_3_mesto"
  | "FIXED_SWISS_32R8_2_3_mesta"
  | "FIXED_SWISS_32R8_1_3_mesto"
  | "FIXED_SWISS_32R8_BRONZE";

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

/**
 * Реестр типов сеток. Новый формат → запись здесь → появится в /admin/brackets и в FORMAT_OPTIONS.
 */
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
