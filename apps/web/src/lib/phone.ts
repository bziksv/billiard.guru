import {
  formatPhoneValidationError,
  type PhoneValidationErrorCode,
  type PhoneValidationErrorParams,
} from "@/lib/phone-validation-errors";

export interface CountryPhoneRule {
  dial: string;
  localLength: number;
  /** Локальный префикс, который пользователь может ввести вместо кода страны (8 для РФ) */
  trunkPrefix?: string;
  example: string;
}

export type PhoneNormalizeResult = {
  e164: string;
  valid: boolean;
  display: string;
  errorCode?: PhoneValidationErrorCode;
  errorParams?: PhoneValidationErrorParams;
  /** RU fallback для admin/API без locale */
  error?: string;
};

function invalidPhone(
  code: PhoneValidationErrorCode,
  params: PhoneValidationErrorParams | undefined,
  display: string,
  e164 = "",
): PhoneNormalizeResult {
  return {
    e164,
    valid: false,
    display,
    errorCode: code,
    errorParams: params,
    error: formatPhoneValidationError(code, params ?? {}, "ru"),
  };
}

export const COUNTRY_PHONE_RULES: Record<string, CountryPhoneRule> = {
  Россия: {
    dial: "7",
    localLength: 10,
    trunkPrefix: "8",
    example: "+7 (917) 234-56-78",
  },
  Казахстан: {
    dial: "7",
    localLength: 10,
    trunkPrefix: "8",
    example: "+7 (701) 234-56-78",
  },
  Беларусь: { dial: "375", localLength: 9, example: "+375 (29) 123-45-67" },
  Украина: { dial: "380", localLength: 9, example: "+380 (50) 123-45-67" },
  Узбекистан: { dial: "998", localLength: 9, example: "+998 (90) 123-45-67" },
  Армения: { dial: "374", localLength: 8, example: "+374 (91) 12-34-56" },
  Грузия: { dial: "995", localLength: 9, example: "+995 (555) 12-34-56" },
  Азербайджан: { dial: "994", localLength: 9, example: "+994 (50) 123-45-67" },
  Кыргызстан: { dial: "996", localLength: 9, example: "+996 (700) 123-456" },
  Молдова: { dial: "373", localLength: 8, example: "+373 (69) 123-456" },
};

const DEFAULT_COUNTRY = "Россия";

export const DEFAULT_PHONE_COUNTRY = DEFAULT_COUNTRY;

/** РФ: вход и подтверждение номера только звонком (без Telegram-авторизации). */
export const PHONE_ONLY_AUTH_COUNTRY = DEFAULT_COUNTRY;

export function isPhoneOnlyAuthCountry(countryName?: string | null): boolean {
  return (
    countryName === PHONE_ONLY_AUTH_COUNTRY || countryName === "Russia"
  );
}

export const PHONE_COUNTRY_NAMES = Object.keys(
  COUNTRY_PHONE_RULES,
) as (keyof typeof COUNTRY_PHONE_RULES)[];

export function isPhoneCountrySupported(countryName: string): boolean {
  return countryName in COUNTRY_PHONE_RULES;
}

export function getPhoneRule(countryName: string): CountryPhoneRule {
  if (!countryName || !isPhoneCountrySupported(countryName)) {
    return COUNTRY_PHONE_RULES[DEFAULT_COUNTRY];
  }
  return COUNTRY_PHONE_RULES[countryName];
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Нормализация в E.164 (+7XXXXXXXXXX) с учётом страны */
export function normalizePhone(
  input: string,
  countryName: string,
): PhoneNormalizeResult {
  const rule = getPhoneRule(countryName);
  let digits = digitsOnly(input);

  if (!digits) {
    return invalidPhone("empty", undefined, "");
  }

  // Убрать международный префикс 00
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  // Уже с кодом страны
  if (digits.startsWith(rule.dial)) {
    const local = digits.slice(rule.dial.length);
    if (local.length === rule.localLength) {
      const e164 = `+${rule.dial}${local}`;
      return {
        e164,
        valid: true,
        display: formatNationalDigits(local, rule),
      };
    }
    if (local.length > rule.localLength) {
      return invalidPhone(
        "tooManyDigits",
        { countryName },
        formatNationalDigits(local.slice(0, rule.localLength), rule),
      );
    }
  }

  // Локальный формат с «8» вместо «+7» (Россия/Казахстан)
  if (
    rule.trunkPrefix &&
    digits.startsWith(rule.trunkPrefix) &&
    digits.length === rule.localLength + 1
  ) {
    digits = rule.dial + digits.slice(1);
    const e164 = `+${digits}`;
    return {
      e164,
      valid: true,
      display: formatPhoneDisplay(e164, countryName),
    };
  }

  // Только локальный номер без кода — подставляем код страны
  if (digits.length === rule.localLength) {
    const e164 = `+${rule.dial}${digits}`;
    return {
      e164,
      valid: true,
      display: formatPhoneDisplay(e164, countryName),
    };
  }

  // Начали с кода страны, но неполный номер
  if (digits.startsWith(rule.dial) && digits.length < rule.dial.length + rule.localLength) {
    return invalidPhone(
      "digitsAfterDial",
      { localLength: rule.localLength, dial: rule.dial },
      formatNationalDigits(digits.slice(rule.dial.length), rule),
      `+${digits}`,
    );
  }

  if (digits.length > rule.localLength && !digits.startsWith(rule.dial)) {
    return invalidPhone(
      "tooManyDigits",
      { countryName },
      formatNationalDigits(digits.slice(0, rule.localLength), rule),
    );
  }

  return invalidPhone(
    "needLocalDigits",
    { localLength: rule.localLength, example: rule.example },
    formatNationalDigits(digits, rule),
    digits.length > 0 ? `+${rule.dial}${digits}` : "",
  );
}

function formatPartial(
  local: string,
  countryName: string,
  rule: CountryPhoneRule,
): string {
  return formatNationalDigits(local, rule);
}

function formatNationalDigits(local: string, rule: CountryPhoneRule): string {
  const d = local.slice(0, rule.localLength);

  if (rule.dial === "7") {
    if (d.length === 0) return "";
    if (d.length <= 3) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    if (d.length <= 8)
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
  }

  if (rule.dial === "375" && d.length >= 1) {
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 5) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7)}`;
  }

  if (rule.dial === "380" && d.length >= 1) {
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 5) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 5)}-${d.slice(5, 7)}-${d.slice(7)}`;
  }

  return d.replace(/(\d{3})(?=\d)/g, "$1-");
}

/** Отображение только национальной части (без +код) */
export function formatNationalDisplay(
  input: string,
  countryName: string,
): string {
  const rule = getPhoneRule(countryName);
  let digits = digitsOnly(input);

  if (digits.startsWith(rule.dial)) {
    digits = digits.slice(rule.dial.length);
  } else if (rule.trunkPrefix && digits.startsWith(rule.trunkPrefix)) {
    digits = digits.slice(1);
  }

  return formatNationalDigits(digits, rule);
}

/** Красивое отображение E.164 */
export function formatPhoneDisplay(e164: string, countryName: string): string {
  const rule = getPhoneRule(countryName);
  const digits = digitsOnly(e164);
  if (!digits.startsWith(rule.dial)) return e164;

  const local = digits.slice(rule.dial.length);
  return `+${rule.dial} ${formatNationalDigits(local, rule)}`;
}

/** Определяет страну по E.164; для +7 нужен hint (Россия / Казахстан). */
export function resolveCountryFromE164(e164: string, hint?: string): string {
  const digits = digitsOnly(e164);
  if (!digits) {
    return hint && isPhoneCountrySupported(hint) ? hint : DEFAULT_COUNTRY;
  }

  const entries = Object.entries(COUNTRY_PHONE_RULES).sort(
    (a, b) => b[1].dial.length - a[1].dial.length,
  );
  for (const [country, rule] of entries) {
    if (digits.startsWith(rule.dial)) {
      if (rule.dial === "7" && hint && isPhoneCountrySupported(hint)) {
        const hintRule = getPhoneRule(hint);
        if (hintRule.dial === "7") return hint;
      }
      return country;
    }
  }
  return hint && isPhoneCountrySupported(hint) ? hint : DEFAULT_COUNTRY;
}

function looksLikeInternationalPhone(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) return true;

  const digits = digitsOnly(trimmed);
  if (digits.startsWith("00") && digits.length > 4) return true;

  const entries = Object.entries(COUNTRY_PHONE_RULES).sort(
    (a, b) => b[1].dial.length - a[1].dial.length,
  );
  for (const [, rule] of entries) {
    if (
      digits.startsWith(rule.dial) &&
      digits.length >= rule.dial.length + rule.localLength
    ) {
      return true;
    }
  }
  return false;
}

/** Нормализация с автоопределением страны по E.164 или подсказке из UI */
export function normalizePhoneAuto(
  input: string,
  countryHint?: string,
): PhoneNormalizeResult & { countryName: string } {
  const hint =
    countryHint && isPhoneCountrySupported(countryHint) ? countryHint : undefined;

  let country: string;
  if (looksLikeInternationalPhone(input)) {
    const trimmed = input.trim();
    const digits = digitsOnly(trimmed);
    const intl = trimmed.startsWith("+")
      ? trimmed
      : digits.startsWith("00")
        ? `+${digits.slice(2)}`
        : `+${digits}`;
    country = resolveCountryFromE164(intl, hint);
  } else {
    country = hint ?? DEFAULT_COUNTRY;
  }

  const result = normalizePhone(input, country);
  return { ...result, countryName: country };
}

/** E.164 (+7473…) → «+7 (473) 123-45-67» для отображения на сайте */
export function formatE164Display(e164: string, countryName?: string): string {
  const trimmed = e164.trim();
  if (!trimmed) return "";

  const digits = digitsOnly(trimmed);
  if (!digits) return trimmed;

  const normalized = trimmed.startsWith("+") ? trimmed : `+${digits}`;
  const country = countryName ?? resolveCountryFromE164(normalized);
  const formatted = formatPhoneDisplay(normalized, country);

  if (formatted === normalized || formatted === trimmed) {
    if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
      const ru = digits.startsWith("8") ? `+7${digits.slice(1)}` : `+${digits}`;
      return formatPhoneDisplay(ru, "Россия");
    }
  }

  return formatted;
}

/** E.164 → «+7-900-111-22-33» (через дефис, без скобок) для компактных таблиц. */
export function formatPhoneDashed(e164: string, countryName?: string): string {
  let input = e164.trim();
  const digits = digitsOnly(input);
  // 10-значный национальный РФ-мобильный без кода страны → считаем +7
  if (!input.startsWith("+") && digits.length === 10 && digits.startsWith("9")) {
    input = `+7${digits}`;
  }
  const display = formatE164Display(input, countryName);
  if (!display) return display;
  return display
    .replace(/[()]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Форматирование при вводе — принимает сырой ввод, возвращает display + e164 */
export function formatPhoneInput(
  raw: string,
  countryName: string,
): PhoneNormalizeResult {
  return normalizePhone(raw, countryName);
}

export function getPhoneExample(countryName: string): string {
  return getPhoneRule(countryName).example;
}

export function getDialCode(countryName: string): string {
  return `+${getPhoneRule(countryName).dial}`;
}
