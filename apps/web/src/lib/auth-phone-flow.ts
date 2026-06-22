import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { normalizePhoneForCity } from "@/lib/phone-server";
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

async function buildCallVerifyResult(
  playerId: string,
  confirmToken: string,
  message: string,
): Promise<Extract<AuthStartResult, { mode: "login" }>> {
  const { token, expiresAt } = await createCallLoginChallenge(playerId);
  return {
    mode: "login",
    authMethod: "call",
    flow: "register",
    challengeToken: token,
    expiresAt: expiresAt.toISOString(),
    message,
    confirmLink: buildConfirmLink(confirmToken),
    callAuth: {
      available: true,
      enabled: true,
      callNumber: getNovofonVerifyNumberDisplay(),
    },
  };
}

export async function resolveAuthByPhone(
  phoneRaw: string,
  countryName = "Россия",
): Promise<{ error?: string; result?: AuthStartResult }> {
  const normalized = normalizePhone(String(phoneRaw), countryName);
  if (!normalized.valid || !normalized.e164) {
    return { error: normalized.error ?? "Некорректный телефон" };
  }

  const player = await prisma.player.findUnique({
    where: { phone: normalized.e164 },
  });

  if (!player) {
    return {
      result: {
        mode: "register",
        phone: normalized.e164,
        message: "Заполните имя и город — дальше подтвердите номер коротким звонком.",
      },
    };
  }

  if (player.isVerified && player.telegramId) {
    const { token, expiresAt } = await createLoginChallenge(player.id, player.telegramId);
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

  if (player.isVerified && isNovofonCallAuthEnabled()) {
    const { token, expiresAt } = await createCallLoginChallenge(player.id);
    return {
      result: {
        mode: "login",
        authMethod: "call",
        flow: "login",
        challengeToken: token,
        expiresAt: expiresAt.toISOString(),
        message: "Позвоните на указанный номер — звонок сбросится автоматически",
        callAuth: {
          available: true,
          enabled: true,
          callNumber: getNovofonVerifyNumberDisplay(),
        },
      },
    };
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
}) {
  const phoneResult = await normalizePhoneForCity(input.phone, input.cityId);
  if (phoneResult.error || !phoneResult.e164) {
    return { error: phoneResult.error ?? "Некорректный телефон" };
  }

  const data = playerRegisterSchema.parse({
    ...input,
    phone: phoneResult.e164,
    rating: 0,
  });

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

  return {
    result: {
      mode: "confirm" as const,
      confirmLink: buildConfirmLink(confirmToken),
      message: "Откройте Telegram и подтвердите регистрацию.",
    },
  };
}
