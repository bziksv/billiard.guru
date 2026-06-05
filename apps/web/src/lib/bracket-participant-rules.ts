export interface BracketParticipantRules {
  min: number;
  max: number;
  /** Если задано — допускается только это число (min/max игнорируются). */
  exact?: number;
  /** Краткая подпись для карточки формата в админке. */
  label: string;
  /** Пояснение при ошибке формирования сетки. */
  hint: string;
}

export type BracketParticipantOverrides = {
  participantMin?: number | null;
  participantMax?: number | null;
  participantExact?: number | null;
};

const EXCEL_REF_64_FORMATS = new Set(["EXCEL_REF_64"]);

const FIXED_SWISS_64_FORMATS = new Set([
  "FIXED_SWISS_64",
  "FIXED_SWISS_64_BRONZE",
  "FIXED_PAIR_SWISS_64",
  "FIXED_PAIR_SWISS_64_BRONZE",
]);

const FIXED_SWISS_32_FORMATS = new Set([
  "FIXED_SWISS_32",
  "FIXED_SWISS_32_BRONZE",
  "FIXED_PAIR_SWISS_32",
  "FIXED_PAIR_SWISS_32_BRONZE",
]);

const FIXED_SWISS_16_FORMATS = new Set([
  "FIXED_SWISS",
  "FIXED_SWISS_16_BRONZE",
  "FIXED_PAIR_SWISS",
  "FIXED_PAIR_SWISS_16_BRONZE",
]);

const OLYMPIC_FORMATS = new Set(["OLYMPIC", "PAIR_OLYMPIC"]);

const OLYMPIC_BRONZE_FORMATS = new Set([
  "OLYMPIC_1L_BRONZE",
  "PAIR_OLYMPIC_1L_BRONZE",
]);

const DYNAMIC_SWISS_FORMATS = new Set(["SWISS", "PAIR_SWISS"]);

export function getDefaultBracketParticipantRules(
  code: string,
): BracketParticipantRules {
  if (EXCEL_REF_64_FORMATS.has(code)) {
    return {
      min: 64,
      max: 64,
      exact: 64,
      label: "ровно 64",
      hint:
        "Сетка «тест с эксельки» — ровно 64 участника, 119 встреч в БД, разметка #1–#119 из Excel. " +
        "Добавьте участников до 64 или смените формат.",
    };
  }
  if (FIXED_SWISS_64_FORMATS.has(code)) {
    const withBronze =
      code === "FIXED_SWISS_64_BRONZE" || code === "FIXED_PAIR_SWISS_64_BRONZE";
    return {
      min: 64,
      max: 64,
      exact: 64,
      label: "ровно 64",
      hint: withBronze
        ? "Сетка «до 2 поражений» на 64 участника — 120 встреч (119 + матч за 3–4 #120), нижняя тур 1–4, олимпийка с 1/8. " +
          "Добавьте участников до 64 или смените формат."
        : "Сетка «до 2 поражений» на 64 участника — 119 встреч, нижняя тур 1–4, олимпийка с 1/8 (#105–#112→#113–#116). " +
          "Добавьте участников до 64 или смените формат.",
    };
  }
  if (FIXED_SWISS_32_FORMATS.has(code)) {
    const withBronze =
      code === "FIXED_SWISS_32_BRONZE" || code === "FIXED_PAIR_SWISS_32_BRONZE";
    return {
      min: 32,
      max: 32,
      exact: 32,
      label: "ровно 32",
      hint: withBronze
        ? "Сетка «до 2 поражений» на 32 участника — 60 встреч (59 + матч за 3–4), нижняя тур 1–4, олимпийка с 1/8. " +
          "Добавьте участников до 32 или смените формат."
        : "Сетка «до 2 поражений» на 32 участника — 59 встреч, нижняя тур 1–4, олимпийка с 1/8. " +
          "Добавьте участников до 32 или смените формат.",
    };
  }
  if (FIXED_SWISS_16_FORMATS.has(code)) {
    return {
      min: 16,
      max: 16,
      exact: 16,
      label: "ровно 16",
      hint:
        "Сетка «до 2 поражений» рассчитана на полный состав из 16 участников. " +
        "С меньшим числом переходы и раскладка ломаются — добавьте участников или смените формат.",
    };
  }
  if (OLYMPIC_BRONZE_FORMATS.has(code)) {
    return {
      min: 4,
      max: 64,
      label: "4–64",
      hint:
        "Для матча за 3–4 место нужны полуфиналы — минимум 4 участника. " +
        "Сетка дополняется до ближайшей степени двойки (автопроходы).",
    };
  }
  if (OLYMPIC_FORMATS.has(code)) {
    return {
      min: 2,
      max: 64,
      label: "2–64",
      hint:
        "Сетка дополняется до ближайшей степени двойки (8, 16, 32…); лишние слоты — автопроходы.",
    };
  }
  if (DYNAMIC_SWISS_FORMATS.has(code)) {
    return {
      min: 2,
      max: 128,
      label: "от 2",
      hint: "Швейцарская по турам — любое число от 2 участников.",
    };
  }
  return {
    min: 2,
    max: 128,
    label: "от 2",
    hint: "Минимум 2 подтверждённых участника.",
  };
}

export function formatParticipantRulesLabel(rules: BracketParticipantRules): string {
  if (rules.exact !== undefined) return `ровно ${rules.exact}`;
  if (rules.min === rules.max) return `${rules.min}`;
  if (rules.max >= 999) return `от ${rules.min}`;
  return `${rules.min}–${rules.max}`;
}

function withLabel(rules: Omit<BracketParticipantRules, "label">): BracketParticipantRules {
  return {
    ...rules,
    label: formatParticipantRulesLabel(rules as BracketParticipantRules),
  };
}

export function resolveBracketParticipantRules(
  format: string,
  overrides?: BracketParticipantOverrides | null,
): BracketParticipantRules {
  const defaults = getDefaultBracketParticipantRules(format);
  if (!overrides) return defaults;

  const hasExactOverride =
    overrides.participantExact !== undefined && overrides.participantExact !== null;
  const hasMinOverride =
    overrides.participantMin !== undefined && overrides.participantMin !== null;
  const hasMaxOverride =
    overrides.participantMax !== undefined && overrides.participantMax !== null;

  if (!hasExactOverride && !hasMinOverride && !hasMaxOverride) {
    return defaults;
  }

  if (hasExactOverride) {
    const exact = overrides.participantExact!;
    return withLabel({
      min: exact,
      max: exact,
      exact,
      hint: defaults.hint,
    });
  }

  const min = hasMinOverride ? overrides.participantMin! : defaults.min;
  const max = hasMaxOverride ? overrides.participantMax! : defaults.max;
  return withLabel({
    min,
    max,
    hint: defaults.hint,
  });
}

/** @deprecated используйте resolveBracketParticipantRules */
export function getBracketParticipantRules(format: string): BracketParticipantRules {
  return getDefaultBracketParticipantRules(format);
}

export function validateBracketParticipantCount(
  format: string,
  count: number,
  rules?: BracketParticipantRules,
): { ok: true } | { ok: false; error: string } {
  const r = rules ?? getDefaultBracketParticipantRules(format);
  if (r.exact !== undefined) {
    if (count !== r.exact) {
      return {
        ok: false,
        error: `Для этого формата нужно ровно ${r.exact} подтверждённых участников (сейчас ${count}). ${r.hint}`,
      };
    }
    return { ok: true };
  }

  if (count < r.min) {
    return {
      ok: false,
      error: `Нужно минимум ${r.min} подтверждённых участников (сейчас ${count}). ${r.hint}`,
    };
  }
  if (count > r.max) {
    return {
      ok: false,
      error: `Не более ${r.max} участников для этого формата (сейчас ${count}).`,
    };
  }
  return { ok: true };
}

export function assertBracketParticipantCount(
  format: string,
  count: number,
  rules?: BracketParticipantRules,
): void {
  const result = validateBracketParticipantCount(format, count, rules);
  if (!result.ok) throw new Error(result.error);
}

export function isFixedSwiss16OnlyFormat(format: string): boolean {
  return FIXED_SWISS_16_FORMATS.has(format);
}

export function isFixedSwiss64OnlyFormat(format: string): boolean {
  return FIXED_SWISS_64_FORMATS.has(format);
}

export function isFixedSwiss32OnlyFormat(format: string): boolean {
  return FIXED_SWISS_32_FORMATS.has(format);
}

export function validateParticipantOverrides(
  patch: BracketParticipantOverrides,
): string | null {
  const hasExact = patch.participantExact != null;
  const hasMin = patch.participantMin != null;
  const hasMax = patch.participantMax != null;

  if (hasExact) {
    if (patch.participantExact! < 2) return "Точное число участников — не меньше 2";
    if (hasMin || hasMax) return "Укажите либо точное число, либо диапазон мин–макс";
    return null;
  }

  if (hasMin && patch.participantMin! < 2) return "Минимум — не меньше 2";
  if (hasMax && patch.participantMax! < 2) return "Максимум — не меньше 2";
  if (hasMin && hasMax && patch.participantMin! > patch.participantMax!) {
    return "Минимум не может быть больше максимума";
  }
  return null;
}
