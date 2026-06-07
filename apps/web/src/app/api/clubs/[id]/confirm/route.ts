import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, getSession } from "@/lib/auth";
import { auditActorFields, requireClubManageAccess } from "@/lib/club-manage";
import {
  getClubConfirmState,
  regenerateClubConfirmLink,
  sendClubConfirmTelegram,
} from "@/lib/club-confirm-server";

const postSchema = z.object({
  action: z.enum(["regenerate", "send_telegram"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireClubManageAccess(id);
    const state = await getClubConfirmState(id);
    return NextResponse.json(state);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить статус" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireClubManageAccess(id);
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const body = postSchema.parse(await request.json());
    const actor = auditActorFields(session);

    const state =
      body.action === "regenerate"
        ? await regenerateClubConfirmLink(id, actor)
        : await sendClubConfirmTelegram(id, actor);

    return NextResponse.json(state);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Не удалось выполнить действие" }, { status: 500 });
  }
}
