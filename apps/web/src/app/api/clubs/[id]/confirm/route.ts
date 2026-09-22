import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, authErrorResponse, getRealPlayer, getSession } from "@/lib/auth";
import { auditActorFields, requireClubManageAccess } from "@/lib/club-manage";
import { requireClubOwnerOnly } from "@/lib/club-staff";
import {
  getClubConfirmState,
  regenerateClubConfirmLink,
  sendClubConfirmTelegram,
} from "@/lib/club-confirm-server";

const postSchema = z.object({
  action: z.enum(["regenerate", "send_telegram"]),
});

async function requireClubConfirmAccess(clubId: string, options?: { readOnly?: boolean }) {
  const { player, club } = await requireClubManageAccess(clubId, options);
  const real = await getRealPlayer();
  if (real?.role === "SUPERADMIN") {
    return { player, club };
  }
  const ownerError = requireClubOwnerOnly(club, player);
  if (ownerError) {
    throw new AuthError(ownerError, 403);
  }
  return { player, club };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireClubConfirmAccess(id, { readOnly: true });
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
    await requireClubConfirmAccess(id);
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
