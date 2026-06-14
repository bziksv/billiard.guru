import { createCallLoginChallenge } from "@/lib/login-challenge";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import {
  getNovofonVerifyNumberDisplay,
  isNovofonCallAuthEnabled,
} from "@/lib/novofon-config";

export async function startCallAuthByPhone(
  phoneRaw: string,
  countryName = "Россия",
): Promise<
  | { error: string; status?: number }
  | {
      authMethod: "call";
      challengeToken: string;
      expiresAt: string;
      callNumber: string;
      message: string;
    }
> {
  if (!isNovofonCallAuthEnabled()) {
    return {
      error: "Вход звонком временно недоступен. Используйте Telegram или попробуйте позже.",
      status: 503,
    };
  }

  const normalized = normalizePhone(String(phoneRaw), countryName);
  if (!normalized.valid || !normalized.e164) {
    return { error: normalized.error ?? "Некорректный телефон", status: 400 };
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
