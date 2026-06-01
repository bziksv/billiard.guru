import { NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const player = await getCurrentPlayer();
  if (!player) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const bookings = await prisma.tableBooking.findMany({
    where: {
      playerId: player.id,
      status: { notIn: ["CANCELLED", "REJECTED"] },
      endsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) },
    },
    include: {
      club: { select: { id: true, name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json(bookings);
}
