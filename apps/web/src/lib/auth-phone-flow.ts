import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhoneAuto, isPhoneOnlyAuthCountry } from "@/lib/phone";
import { normalizePhoneForCity, resolveCountryName } from "@/lib/phone-server";
import {
  formatPhoneValidationError,
  type PhoneValidationErrorCode,
  type PhoneValidationErrorParams,
} from "@/lib/phone-validation-errors";
import type { AppLocale } from "@/i18n/routing";
import { createLoginChallenge, createCallLoginChallenge } from "@/lib/login-challenge";
import { buildConfirmLink } from "@/lib/telegram";
import { writeAuditLog } from "@/lib/audit";
import { buildPlayerLatinFields } from "@/lib/latin-names";
import { playerRegisterSchema } from "@/lib/validators";
import {
  getNovofonVerifyNumberDisplay,
  isNovofonCallAuthConfigured,
  isNovofonCallAuthEnabled,
} from "@/lib/novofon-config";

export type AuthStartResult =
  | {
      mode: "login";
      authMethod: "telegram" | "call";
      challengeToken: string;
      expiresAt: string;
      message: string;
      flow?: "register" | "login";
      confirmLink?: string;
      callAuth?: {
        available: boolean;
        enabled: boolean;
        callNumber: string | null;
      };
    }
  | {
      mode: "confirm";
      confirmLink: string;
      message: string;
    }
  | {
      mode: "register";
      phone: string;
      message: string;
    };

async function ensureConfirmToken(playerId: string, existing: string | null) {
  const confirmToken = existing ?? randomUUID();
  if (!existing) {
    await prisma.player.update({
      where: { id: playerId },
      data: { confirmToken },
    });
  }
  return confirmToken;
}

async function buildCallLoginResult(
  playerId: string,
  message: string,
  flow: "register" | "login" = "login",
  confirmToken?: string,
): Promise<Extract<AuthStartResult, { mode: "login" }>> {
  const { token, expiresAt } = await createCallLoginChallenge(playerId);
  return {
    mode: "login",
    authMethod: "call",
    flow,
    challengeToken: token,
    expiresAt: expiresAt.toISOString(),
    message,
    ...(confirmToken ? { confirmLink: buildConfirmLink(confirmToken) } : {}),
    callAuth: {
      available: true,
      enabled: true,
      callNumber: getNovofonVerifyNumberDisplay(),
    },
  };
}

async function buildCallVerifyResult(
  playerId: string,
  confirmToken: string,
  message: string,
): Promise<Extract<AuthStartResult, { mode: "login" }>> {
  return buildCallLoginResult(playerId, message, "register", confirmToken);
}

function callAuthUnavailableError(phoneOnlyAuth: boolean): string {
  return phoneOnlyAuth
    ? "Вход по телефону временно недоступен. Попробуйте позже."
    : "Подтверждение временно недоступно. Попробуйте позже или используйте Telegram.";
}

export async function resolveAuthByPhone(
  phoneRaw: string,
  countryName?: string,
  locale: AppLocale = "ru",
): Promise<{
  error?: string;
  errorCode?: PhoneValidationErrorCode;
  errorParams?: PhoneValidationErrorParams;
  result?: AuthStartResult;
}> {
  const normalized = normalizePhoneAuto(String(phoneRaw), countryName);
  if (!normalized.valid || !normalized.e164) {
    const code = normalized.errorCode ?? "invalid";
    return {
      error: formatPhoneValidationError(code, normalized.errorParams ?? {}, locale),
      errorCode: code,
      errorParams: normalized.errorParams,
    };
  }

  const authCountry = countryName ?? normalized.countryName;
  const phoneOnlyAuth = isPhoneOnlyAuthCountry(authCountry);

  const player = await prisma.player.findUnique({
    where: { phone: normalized.e164 },
  });

  if (!player) {
    return {
      result: {
        mode: "register",
        phone: normalized.e164,
        message: phoneOnlyAuth
          ? "Заполните имя и город — дальше подтвердите номер коротким звонком."
          : "Заполните имя и город — дальше подтвердите номер коротким звонком или в Telegram.",
      },
    };
  }

  if (player.isVerified) {
    if (phoneOnlyAuth) {
      if (!isNovofonCallAuthEnabled()) {
        return { error: callAuthUnavailableError(true) };
      }
      return {
        result: await buildCallLoginResult(
          player.id,
          "Позвоните на указанный номер — звонок сбросится автоматически",
          "login",
        ),
      };
    }

    if (player.telegramId) {
      const { token, expiresAt } = await createLoginChallenge(
        player.id,
        player.telegramId,
      );
      return {
        result: {
          mode: "login",
          authMethod: "telegram",
          flow: "login",
          challengeToken: token,
          expiresAt: expiresAt.toISOString(),
          message: "Подтвердите вход в Telegram",
          callAuth: {
            available: isNovofonCallAuthConfigured(),
            enabled: isNovofonCallAuthEnabled(),
            callNumber: getNovofonVerifyNumberDisplay(),
          },
        },
      };
    }

    if (isNovofonCallAuthEnabled()) {
      return {
        result: await buildCallLoginResult(
          player.id,
          "Позвоните на указанный номер — звонок сбросится автоматически",
          "login",
        ),
      };
    }

    return { error: callAuthUnavailableError(false) };
  }

  const confirmToken = await ensureConfirmToken(player.id, player.confirmToken);

  if (isNovofonCallAuthEnabled()) {
    return {
      result: await buildCallVerifyResult(
        player.id,
        confirmToken,
        "Позвоните на указанный номер с телефона, который вводили — так мы подтвердим регистрацию.",
      ),
    };
  }

  if (phoneOnlyAuth) {
    return { error: callAuthUnavailableError(true) };
  }

  return {
    result: {
      mode: "confirm",
      confirmLink: buildConfirmLink(confirmToken),
      message: player.isVerified
        ? "Привяжите Telegram для входа на сайт."
        : "Подтвердите регистрацию в Telegram (кнопка «Поделиться контактом»).",
    },
  };
}

export async function registerPlayerByPhone(input: {
  firstName: string;
  lastName: string;
  middleName?: string;
  cityId: string;
  phone: string;
  email?: string;
  birthDate?: string;
  locale?: AppLocale;
}) {
  const phoneResult = await normalizePhoneForCity(input.phone, input.cityId);
  if (phoneResult.error || !phoneResult.e164) {
    const code = phoneResult.errorCode ?? "invalid";
    const params = phoneResult.errorParams ?? {};
    const locale = input.locale ?? "ru";
    return {
      error: formatPhoneValidationError(code, params, locale),
      errorCode: code,
      errorParams: params,
    };
  }

  const data = playerRegisterSchema.parse({
    ...input,
    phone: phoneResult.e164,
    rating: 0,
  });

  const cityCountry = (await resolveCountryName(input.cityId)) ?? "Россия";
  const phoneOnlyAuth = isPhoneOnlyAuthCountry(cityCountry);

  const existing = await prisma.player.findUnique({
    where: { phone: data.phone },
  });

  if (existing?.isVerified && existing.telegramId) {
    return {
      error: "Этот номер уже зарегистрирован. Нажмите «Продолжить» для входа.",
    };
  }

  if (existing && !existing.isVerified) {
    const confirmToken = existing.confirmToken ?? randomUUID();
    await prisma.player.update({
      where: { id: existing.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName || null,
        ...buildPlayerLatinFields(data),
        cityId: data.cityId,
        email: data.email || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        confirmToken,
      },
    });

    if (isNovofonCallAuthEnabled()) {
      return {
        result: await buildCallVerifyResult(
          existing.id,
          confirmToken,
          "Позвоните на указанный номер — так мы подтвердим ваш номер.",
        ),
      };
    }

    if (phoneOnlyAuth) {
      return { error: callAuthUnavailableError(true) };
    }

    return {
      result: {
        mode: "confirm" as const,
        confirmLink: buildConfirmLink(confirmToken),
        message: "Откройте Telegram и подтвердите регистрацию.",
      },
    };
  }

  const confirmToken = randomUUID();
  const player = await prisma.player.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
      ...buildPlayerLatinFields(data),
      cityId: data.cityId,
      phone: data.phone,
      email: data.email || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      rating: 0,
      confirmToken,
    },
  });

  await writeAuditLog({
    actorType: "player",
    actorId: player.id,
    action: "player.register",
    entityType: "player",
    entityId: player.id,
    summary: "Самостоятельная регистрация на сайте",
  });

  if (isNovofonCallAuthEnabled()) {
    return {
      result: await buildCallVerifyResult(
        player.id,
        confirmToken,
        "Позвоните на указанный номер — так мы подтвердим ваш номер.",
      ),
    };
  }

  if (phoneOnlyAuth) {
    return { error: callAuthUnavailableError(true) };
  }

  return {
    result: {
      mode: "confirm" as const,
      confirmLink: buildConfirmLink(confirmToken),
      message: "Откройте Telegram и подтвердите регистрацию.",
    },
  };
}
