import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sanitizePlayer } from "@/lib/api-sanitize";
import {
  authErrorResponse,
  assertNotPreviewWrite,
  getRealPlayer,
  requirePlayersDirectoryAccess,
} from "@/lib/auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { registerPlayerFromFormData } from "@/lib/player-register-server";

export async function GET() {
  try {
    const access = await requirePlayersDirectoryAccess();
    const players = await prisma.player.findMany({
      include: { city: { include: { country: true } } },
      orderBy: { rating: "desc" },
    });
    const mapped = players.map((p) => {
      const safe = sanitizePlayer(p as unknown as Record<string, unknown>);
      // Managers need phone for roster disambiguation; hide telegramId/email.
      if (access.mode === "manage") {
        const { telegramId: _tg, email: _e, ...rest } = safe as Record<string, unknown>;
        return rest;
      }
      return safe;
    });
    return NextResponse.json(mapped);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить игроков" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(randomUUID());

  try {
    await assertNotPreviewWrite();
    // Admin UI or tournament manage (logged-in manager) — not anonymous.
    await requirePlayersDirectoryAccess();
    const formData = await request.formData();
    const { player, confirmLink } = await registerPlayerFromFormData(formData);
    log.info({ playerId: player.id }, "Player registered");

    const safe = sanitizePlayer(player as unknown as Record<string, unknown>);
    // confirmLink only for SUPERADMIN registration flows (admin panel).
    const real = await getRealPlayer();
    const includeLink = real?.role === "SUPERADMIN";

    return NextResponse.json(
      includeLink ? { ...safe, confirmLink } : safe,
      { status: 201 },
    );
  } catch (error) {
    log.error({ error }, "Player registration failed");
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось зарегистрировать игрока" }, { status: 500 });
  }
}
