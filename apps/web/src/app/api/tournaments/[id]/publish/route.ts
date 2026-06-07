import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { publishTournamentFromManage } from "@/lib/tournament-approval";
import { requireTournamentManageAccess } from "@/lib/tournament-manage";
import { tournamentPublishSchema } from "@/lib/validators";
import { ZodError } from "zod";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session } = await requireTournamentManageAccess(id);
    const body = request.headers.get("content-type")?.includes("application/json")
      ? tournamentPublishSchema.parse(await request.json())
      : {};
    const result = await publishTournamentFromManage(id, session.playerId, body);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Неверные данные" }, { status: 400 });
    }
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось опубликовать турнир" }, { status: 500 });
  }
}
