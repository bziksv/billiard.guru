/**
 * Разовый: скопировать telegramId владельца на клуб, если у клуба его нет.
 * Usage: npx tsx scripts/bind-club-telegram-from-owner.ts <clubId>
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const clubId = process.argv[2];
  if (!clubId) {
    console.error("Usage: npx tsx scripts/bind-club-telegram-from-owner.ts <clubId>");
    process.exit(1);
  }

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) {
    console.error("Club not found:", clubId);
    process.exit(1);
  }

  if (club.telegramId) {
    console.log("Already bound:", club.telegramId, club.telegramUsername);
    return;
  }

  const owner = await prisma.player.findFirst({
    where: { phone: club.phone },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      telegramId: true,
      telegramUsername: true,
    },
  });

  if (!owner?.telegramId) {
    console.error("Owner has no telegramId. phone=", club.phone, "owner=", owner);
    process.exit(1);
  }

  const updated = await prisma.club.update({
    where: { id: clubId },
    data: {
      telegramId: owner.telegramId,
      telegramUsername: owner.telegramUsername,
      isVerified: true,
      confirmToken: null,
    },
  });

  console.log("Bound club", updated.name, "→", {
    telegramId: updated.telegramId,
    telegramUsername: updated.telegramUsername,
    owner: `${owner.lastName} ${owner.firstName}`,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
