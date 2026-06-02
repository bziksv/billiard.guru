import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { publishTournamentFromManage } from "@/lib/tournament-approval";
import { requireTournamentManageAccess } from "@/lib/tournament-manage";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { session } = await requireTournamentManageAccess(id);
    const result = await publishTournamentFromManage(id, session.playerId);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось опубликовать турнир" }, { status: 500 });
  }
}
