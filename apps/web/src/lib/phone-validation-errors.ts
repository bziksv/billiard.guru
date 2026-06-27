import type { AppLocale } from "@/i18n/routing";

export const PHONE_VALIDATION_ERROR_CODES = [
  "empty",
  "tooManyDigits",
  "digitsAfterDial",
  "needLocalDigits",
  "countryMismatch",
  "invalid",
] as const;

export type PhoneValidationErrorCode =
  (typeof PHONE_VALIDATION_ERROR_CODES)[number];

export type PhoneValidationErrorParams = Partial<{
  countryName: string;
  localLength: number;
  dial: string;
  example: string;
  phoneDial: string;
  cityCountry: string;
  cityDial: string;
}>;

export type PhoneValidationFailure = {
  code: PhoneValidationErrorCode;
  params?: PhoneValidationErrorParams;
};

export function phoneFailure(
  code: PhoneValidationErrorCode,
  params?: PhoneValidationErrorParams,
): PhoneValidationFailure {
  return { code, params };
}

/** EN-имена стран для API/сервера (ключи — nameRu из БД / COUNTRY_PHONE_RULES). */
export const PHONE_COUNTRY_NAME_EN: Record<string, string> = {
  Россия: "Russia",
  Казахстан: "Kazakhstan",
  Беларусь: "Belarus",
  Украина: "Ukraine",
  Узбекистан: "Uzbekistan",
  Армения: "Armenia",
  Грузия: "Georgia",
  Азербайджан: "Azerbaijan",
  Кыргызстан: "Kyrgyzstan",
  Молдова: "Moldova",
};

/** Держать в sync с `messages/{locale}.json` → `phone.validation.*` */
const MESSAGES: Record<
  AppLocale,
  Record<PhoneValidationErrorCode, string>
> = {
  ru: {
    empty: "Введите номер телефона",
    tooManyDigits: "Слишком много цифр для {countryName}",
    digitsAfterDial: "Введите {localLength} цифр после +{dial}",
    needLocalDigits: "Нужно {localLength} цифр (пример: {example})",
    countryMismatch:
      "Номер (+{phoneDial}) не соответствует стране города ({cityCountry}, +{cityDial})",
    invalid: "Некорректный телефон",
  },
  en: {
    empty: "Enter a phone number",
    tooManyDigits: "Too many digits for {countryName}",
    digitsAfterDial: "Enter {localLength} digits after +{dial}",
    needLocalDigits: "Enter {localLength} digits (e.g. {example})",
    countryMismatch:
      "Number (+{phoneDial}) does not match the city's country ({cityCountry}, +{cityDial})",
    invalid: "Invalid phone number",
  },
};

function localizeCountryName(name: string, locale: AppLocale): string {
  if (locale === "en") return PHONE_COUNTRY_NAME_EN[name] ?? name;
  return name;
}

function interpolate(
  template: string,
  params: PhoneValidationErrorParams,
  locale: AppLocale,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const raw = params[key as keyof PhoneValidationErrorParams];
    if (raw === undefined || raw === null) return "";
    if (key === "countryName" || key === "cityCountry") {
      return localizeCountryName(String(raw), locale);
    }
    return String(raw);
  });
}

export function formatPhoneValidationError(
  code: PhoneValidationErrorCode,
  params: PhoneValidationErrorParams = {},
  locale: AppLocale = "ru",
): string {
  return interpolate(MESSAGES[locale][code], params, locale);
}

export function isPhoneValidationErrorCode(
  value: unknown,
): value is PhoneValidationErrorCode {
  return (
    typeof value === "string" &&
    (PHONE_VALIDATION_ERROR_CODES as readonly string[]).includes(value)
  );
}
