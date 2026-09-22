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
      callAuth?: {
        available: boolean;
        enabled: boolean;
        callNumber: string | null;
      };
    }
  | {
      /** Open Telegram bot (generic link) — no confirmToken in response. */
      mode: "confirm";
      message: string;
    }
  | {
      mode: "register";
      phone: string;
      message: string;
    };

/** Uniform public auth payload — same keys always (A2 anti-enumeration). */
export type AuthContinuePublic = {
  mode: "continue";
  message: string;
  phone: string | null;
  challengeToken: string | null;
  expiresAt: string | null;
  authMethod: "telegram" | "call" | null;
  callAuth: {
    available: boolean;
    enabled: boolean;
    callNumber: string | null;
  };
  openTelegram: boolean;
  needsProfile: boolean;
};

function callAuthSnapshot() {
  return {
    available: isNovofonCallAuthConfigured(),
    enabled: isNovofonCallAuthEnabled(),
    callNumber: getNovofonVerifyNumberDisplay(),
  };
}

/** Map internal auth result → public continue DTO (no register/login mode leak). */
export function toPublicAuthContinue(
  result: AuthStartResult,
  requestE164?: string | null,
): AuthContinuePublic {
  const callAuth = callAuthSnapshot();
  if (result.mode === "login") {
    return {
      mode: "continue",
      message: result.message,
      phone: requestE164 ?? null,
      challengeToken: result.challengeToken,
      expiresAt: result.expiresAt,
      authMethod: result.authMethod,
      callAuth: result.callAuth ?? callAuth,
      openTelegram: false,
      needsProfile: false,
    };
  }
  if (result.mode === "confirm") {
    return {
      mode: "continue",
      message: result.message,
      phone: requestE164 ?? null,
      challengeToken: null,
      expiresAt: null,
      authMethod: null,
      callAuth,
      openTelegram: true,
      needsProfile: false,
    };
  }
  return {
    mode: "continue",
    message: result.message,
    phone: result.phone,
    challengeToken: null,
    expiresAt: null,
    authMethod: null,
    callAuth,
    openTelegram: false,
    needsProfile: true,
  };
}

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
): Promise<Extract<AuthStartResult, { mode: "login" }>> {
  const { token, expiresAt } = await createCallLoginChallenge(playerId);
  return {
    mode: "login",
    authMethod: "call",
    flow,
    challengeToken: token,
    expiresAt: expiresAt.toISOString(),
    message,
    callAuth: {
      available: true,
      enabled: true,
      callNumber: getNovofonVerifyNumberDisplay(),
    },
  };
}

async function buildCallVerifyResult(
  playerId: string,
  message: string,
): Promise<Extract<AuthStartResult, { mode: "login" }>> {
  return buildCallLoginResult(playerId, message, "register");
}

function callAuthUnavailableError(phoneOnlyAuth: boolean): string {
  return phoneOnlyAuth
    ? "Вход по телефону временно недоступен. Попробуйте позже."
    : "Подтверждение временно недоступно. Попробуйте позже или используйте Telegram.";
}

function genericAuthContinueMessage(phoneOnlyAuth: boolean): string {
  return phoneOnlyAuth
    ? "Продолжите вход: подтвердите номер коротким звонком."
    : "Продолжите вход: подтвердите номер коротким звонком или в Telegram.";
}

async function padAuthTiming(startedAt: number, minMs = 120) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < minMs) {
    await new Promise((r) => setTimeout(r, minMs - elapsed));
  }
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
  const startedAt = Date.now();
  const normalized = normalizePhoneAuto(String(phoneRaw), countryName);
  if (!normalized.valid || !normalized.e164) {
    const code = normalized.errorCode ?? "invalid";
    await padAuthTiming(startedAt);
    return {
      error: formatPhoneValidationError(code, normalized.errorParams ?? {}, locale),
      errorCode: code,
      errorParams: normalized.errorParams,
    };
  }

  const authCountry = countryName ?? normalized.countryName;
  const phoneOnlyAuth = isPhoneOnlyAuthCountry(authCountry);
  const continueMsg = genericAuthContinueMessage(phoneOnlyAuth);

  const player = await prisma.player.findUnique({
    where: { phone: normalized.e164 },
  });

  if (!player) {
    await padAuthTiming(startedAt);
    return {
      result: {
        mode: "register",
        phone: normalized.e164,
        message: continueMsg,
      },
    };
  }

  if (player.isVerified) {
    if (phoneOnlyAuth) {
      if (!isNovofonCallAuthEnabled()) {
        await padAuthTiming(startedAt);
        return { error: callAuthUnavailableError(true) };
      }
      const result = await buildCallLoginResult(player.id, continueMsg, "login");
      await padAuthTiming(startedAt);
      return { result };
    }

    if (player.telegramId) {
      const { token, expiresAt } = await createLoginChallenge(
        player.id,
        player.telegramId,
      );
      await padAuthTiming(startedAt);
      return {
        result: {
          mode: "login",
          authMethod: "telegram",
          flow: "login",
          challengeToken: token,
          expiresAt: expiresAt.toISOString(),
          message: continueMsg,
          callAuth: {
            available: isNovofonCallAuthConfigured(),
            enabled: isNovofonCallAuthEnabled(),
            callNumber: getNovofonVerifyNumberDisplay(),
          },
        },
      };
    }

    if (isNovofonCallAuthEnabled()) {
      const result = await buildCallLoginResult(player.id, continueMsg, "login");
      await padAuthTiming(startedAt);
      return { result };
    }

    await padAuthTiming(startedAt);
    return { error: callAuthUnavailableError(false) };
  }

  // Keep token in DB for Telegram contact / deep-link from bot — never return it to the browser.
  await ensureConfirmToken(player.id, player.confirmToken);

  if (isNovofonCallAuthEnabled()) {
    const result = await buildCallVerifyResult(player.id, continueMsg);
    await padAuthTiming(startedAt);
    return { result };
  }

  if (phoneOnlyAuth) {
    await padAuthTiming(startedAt);
    return { error: callAuthUnavailableError(true) };
  }

  await padAuthTiming(startedAt);
  return {
    result: {
      mode: "confirm",
      message: continueMsg,
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
  registerAsClubOwner?: boolean;
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
    registerAsClubOwner: input.registerAsClubOwner ?? false,
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
        registerAsClubOwner: data.registerAsClubOwner,
      },
    });

    if (isNovofonCallAuthEnabled()) {
      return {
        result: await buildCallVerifyResult(
          existing.id,
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
      registerAsClubOwner: data.registerAsClubOwner,
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
      message: "Откройте Telegram и подтвердите регистрацию.",
    },
  };
}
