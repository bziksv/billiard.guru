import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  approveIdeaByAdmin,
  rejectIdeaByAdmin,
  replyToIdeaByAdmin,
} from "@/lib/idea-moderation";
import { ideaModerateSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const data = ideaModerateSchema.parse(await request.json());

    const result =
      data.action === "approve"
        ? await approveIdeaByAdmin(id, session.playerId)
        : data.action === "reject"
          ? await rejectIdeaByAdmin(id, session.playerId, data.rejectReason)
          : await replyToIdeaByAdmin(id, session.playerId, data.adminReply!);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: result.message,
      telegramSent: "telegramSent" in result ? result.telegramSent : undefined,
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message = error instanceof Error ? error.message : "Не удалось модерировать";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
