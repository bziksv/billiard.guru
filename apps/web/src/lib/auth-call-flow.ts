import { createCallLoginChallenge } from "@/lib/login-challenge";
import { normalizePhoneAuto, isPhoneOnlyAuthCountry } from "@/lib/phone";
import {
  formatPhoneValidationError,
  type PhoneValidationErrorCode,
  type PhoneValidationErrorParams,
} from "@/lib/phone-validation-errors";
import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import {
  getNovofonVerifyNumberDisplay,
  isNovofonCallAuthEnabled,
} from "@/lib/novofon-config";

export async function startCallAuthByPhone(
  phoneRaw: string,
  countryName?: string,
  locale: AppLocale = "ru",
): Promise<
  | {
      error: string;
      errorCode?: PhoneValidationErrorCode;
      errorParams?: PhoneValidationErrorParams;
      status?: number;
    }
  | {
      authMethod: "call";
      challengeToken: string;
      expiresAt: string;
      callNumber: string;
      message: string;
    }
> {
  if (!isNovofonCallAuthEnabled()) {
    const phoneOnlyAuth = isPhoneOnlyAuthCountry(countryName);
    return {
      error: phoneOnlyAuth
        ? "Вход по телефону временно недоступен. Попробуйте позже."
        : "Вход звонком временно недоступен. Используйте Telegram или попробуйте позже.",
      status: 503,
    };
  }

  const normalized = normalizePhoneAuto(String(phoneRaw), countryName);
  if (!normalized.valid || !normalized.e164) {
    const code = normalized.errorCode ?? "invalid";
    return {
      error: formatPhoneValidationError(code, normalized.errorParams ?? {}, locale),
      errorCode: code,
      errorParams: normalized.errorParams,
      status: 400,
    };
  }

  const player = await prisma.player.findUnique({
    where: { phone: normalized.e164 },
  });

  if (!player) {
    return { error: "Номер не найден. Сначала зарегистрируйтесь.", status: 404 };
  }
  const callNumber = getNovofonVerifyNumberDisplay();
  if (!callNumber) {
    return { error: "Номер для звонка не настроен.", status: 503 };
  }

  const { token, expiresAt } = await createCallLoginChallenge(player.id);

  return {
    authMethod: "call",
    challengeToken: token,
    expiresAt: expiresAt.toISOString(),
    callNumber,
    message: "Позвоните на указанный номер — звонок сбросится автоматически.",
  };
}
