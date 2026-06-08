export interface CountryPhoneRule {
  dial: string;
  localLength: number;
  /** Локальный префикс, который пользователь может ввести вместо кода страны (8 для РФ) */
  trunkPrefix?: string;
  example: string;
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

export function getPhoneRule(countryName: string): CountryPhoneRule {
  return COUNTRY_PHONE_RULES[countryName] ?? COUNTRY_PHONE_RULES[DEFAULT_COUNTRY];
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Нормализация в E.164 (+7XXXXXXXXXX) с учётом страны */
export function normalizePhone(
  input: string,
  countryName: string,
): { e164: string; valid: boolean; error?: string; display: string } {
  const rule = getPhoneRule(countryName);
  let digits = digitsOnly(input);

  if (!digits) {
    return { e164: "", valid: false, error: "Введите номер телефона", display: "" };
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
    return {
      e164: `+${digits}`,
      valid: false,
      error: `Введите ${rule.localLength} цифр после +${rule.dial}`,
      display: formatNationalDigits(digits.slice(rule.dial.length), rule),
    };
  }

  if (digits.length > rule.localLength && !digits.startsWith(rule.dial)) {
    return {
      e164: "",
      valid: false,
      error: `Слишком много цифр для ${countryName}`,
      display: formatNationalDigits(digits.slice(0, rule.localLength), rule),
    };
  }

  return {
    e164: digits.length > 0 ? `+${rule.dial}${digits}` : "",
    valid: false,
    error: `Нужно ${rule.localLength} цифр (пример: ${rule.example})`,
    display: formatNationalDigits(digits, rule),
  };
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

function resolveCountryFromE164(e164: string): string {
  const digits = digitsOnly(e164);
  const entries = Object.entries(COUNTRY_PHONE_RULES).sort(
    (a, b) => b[1].dial.length - a[1].dial.length,
  );
  for (const [country, rule] of entries) {
    if (digits.startsWith(rule.dial)) {
      return country;
    }
  }
  return DEFAULT_COUNTRY;
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

/** Форматирование при вводе — принимает сырой ввод, возвращает display + e164 */
export function formatPhoneInput(
  raw: string,
  countryName: string,
): { display: string; e164: string; valid: boolean; error?: string } {
  return normalizePhone(raw, countryName);
}

export function getPhoneExample(countryName: string): string {
  return getPhoneRule(countryName).example;
}

export function getDialCode(countryName: string): string {
  return `+${getPhoneRule(countryName).dial}`;
}
