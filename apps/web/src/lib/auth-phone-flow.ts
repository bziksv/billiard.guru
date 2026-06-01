import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";
import { normalizePhoneForCity } from "@/lib/phone-server";
import { createLoginChallenge } from "@/lib/login-challenge";
import { buildConfirmLink } from "@/lib/telegram";
import { writeAuditLog } from "@/lib/audit";
import { playerRegisterSchema } from "@/lib/validators";

export type AuthStartResult =
  | {
      mode: "login";
      challengeToken: string;
      expiresAt: string;
      message: string;
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
        message: "Заполните имя и город — затем подтвердите профиль в Telegram.",
      },
    };
  }

  if (player.isVerified && player.telegramId) {
    const { token, expiresAt } = await createLoginChallenge(player.id, player.telegramId);
    return {
      result: {
        mode: "login",
        challengeToken: token,
        expiresAt: expiresAt.toISOString(),
        message: "Подтвердите вход в Telegram",
      },
    };
  }

  let confirmToken = player.confirmToken;
  if (!confirmToken) {
    confirmToken = randomUUID();
    await prisma.player.update({
      where: { id: player.id },
      data: { confirmToken },
    });
  }

  return {
    result: {
      mode: "confirm",
      confirmLink: buildConfirmLink(confirmToken),
      message: player.isVerified
        ? "Привяжите Telegram для входа на сайт."
        : "Подтвердите регистрацию в Telegram (кнопка «Поделиться контактом» или ссылка ниже).",
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
        cityId: data.cityId,
        email: data.email || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        confirmToken,
      },
    });
    return {
      result: {
        mode: "confirm" as const,
        confirmLink: buildConfirmLink(confirmToken),
        message: "Подтвердите профиль в Telegram.",
      },
    };
  }

  const confirmToken = randomUUID();
  const player = await prisma.player.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || null,
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

  return {
    result: {
      mode: "confirm" as const,
      confirmLink: buildConfirmLink(confirmToken),
      message: "Откройте Telegram и подтвердите регистрацию.",
    },
  };
}
