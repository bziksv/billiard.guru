import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, getCurrentPlayer } from "@/lib/auth";
import { castIdeaVote } from "@/lib/idea-moderation";
import { ideaVoteSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: ideaId } = await params;
    const player = await getCurrentPlayer();
    if (!player) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const data = ideaVoteSchema.parse(await request.json());
    const stats = await castIdeaVote(ideaId, player.id, data.value);

    return NextResponse.json(stats);
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message = error instanceof Error ? error.message : "Не удалось проголосовать";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
