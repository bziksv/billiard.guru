import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  deleteSiteNews,
  republishSiteNews,
  unpublishSiteNews,
} from "@/lib/site-news-server";
import { siteNewsActionSchema } from "@/lib/validators";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const data = siteNewsActionSchema.parse(await request.json());

    const result =
      data.action === "unpublish"
        ? await unpublishSiteNews(id, session.playerId)
        : await republishSiteNews(id, session.playerId);

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось обновить новость" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSuperAdmin();
    const { id } = await params;
    const result = await deleteSiteNews(id, session.playerId);
    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 400 });
  }
}
