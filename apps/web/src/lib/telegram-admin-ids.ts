import { prisma } from "@/lib/prisma";

/** Telegram chat id суперадминов для тестов и модерации идей. */
export async function getSuperadminTelegramIds(): Promise<string[]> {
  const fromEnv = process.env.TELEGRAM_ADMIN_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;

  const admins = await prisma.player.findMany({
    where: { role: "SUPERADMIN", isVerified: true, telegramId: { not: null } },
    select: { telegramId: true },
  });
  return admins.map((a) => a.telegramId!).filter(Boolean);
}
