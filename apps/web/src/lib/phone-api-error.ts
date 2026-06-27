import type { AppLocale } from "@/i18n/routing";
import {
  formatPhoneValidationError,
  isPhoneValidationErrorCode,
  type PhoneValidationErrorParams,
} from "@/lib/phone-validation-errors";
import type { PhoneNormalizeResult } from "@/lib/phone";

export function phoneErrorPayload(
  result: Pick<PhoneNormalizeResult, "errorCode" | "errorParams">,
  locale: AppLocale = "ru",
) {
  const code = result.errorCode ?? "invalid";
  const params = result.errorParams ?? {};
  return {
    errorCode: code,
    errorParams: params,
    error: formatPhoneValidationError(code, params, locale),
  };
}

export function resolvePhoneApiError(
  data: {
    error?: string;
    errorCode?: string;
    errorParams?: PhoneValidationErrorParams;
  },
  locale: AppLocale,
  fallback = "Error",
): string {
  if (isPhoneValidationErrorCode(data.errorCode)) {
    return formatPhoneValidationError(
      data.errorCode,
      data.errorParams ?? {},
      locale,
    );
  }
  return data.error ?? fallback;
}

export function parseApiLocale(value: unknown): AppLocale {
  return value === "en" ? "en" : "ru";
}
