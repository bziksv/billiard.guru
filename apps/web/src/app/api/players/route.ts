import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { registerPlayerFromFormData } from "@/lib/player-register-server";

export async function GET() {
  const players = await prisma.player.findMany({
    include: { city: { include: { country: true } } },
    orderBy: { rating: "desc" },
  });
  return NextResponse.json(players);
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());

  try {
    const formData = await request.formData();
    const { player, confirmLink } = await registerPlayerFromFormData(formData);
    log.info({ playerId: player.id }, "Player registered");

    return NextResponse.json({ ...player, confirmLink }, { status: 201 });
  } catch (error) {
    log.error({ error }, "Player registration failed");
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось зарегистрировать игрока" }, { status: 500 });
  }
}
