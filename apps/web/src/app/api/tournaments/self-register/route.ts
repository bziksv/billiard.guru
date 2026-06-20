import { NextRequest, NextResponse } from "next/server";
import { getCurrentPlayer } from "@/lib/auth";
import { submitSelfTournamentRegistration } from "@/lib/tournament-self-register-server";
import { z } from "zod";

const selfRegisterSchema = z.object({
  tournamentId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Войдите, чтобы подать заявку" }, { status: 401 });
    }

    const body = await request.json();
    const { tournamentId } = selfRegisterSchema.parse(body);

    const result = await submitSelfTournamentRegistration(player.id, tournamentId);
    if (!result.ok) {
      const status =
        result.error.includes("подтвердите") || result.error.includes("Подтвердите")
          ? 403
          : result.error.includes("уже")
            ? 409
            : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json(
      { id: result.registrationId, tournamentId },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    if (error instanceof Error && error.message !== "Турнир не найден") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось подать заявку" }, { status: 500 });
  }
}
