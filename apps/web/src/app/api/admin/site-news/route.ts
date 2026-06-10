import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { createSiteNews, listSiteNewsAdmin, serializeSiteNews } from "@/lib/site-news-server";
import { siteNewsSchema } from "@/lib/validators";

export async function GET() {
  try {
    await requireSuperAdmin();
    const rows = await listSiteNewsAdmin();
    return NextResponse.json(rows.map(serializeSiteNews));
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить новости" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const data = siteNewsSchema.parse(await request.json());
    const item = await createSiteNews({
      authorId: session.playerId,
      title: data.title,
      body: data.body,
    });
    return NextResponse.json(serializeSiteNews(item), { status: 201 });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    const message = error instanceof Error ? error.message : "Не удалось опубликовать";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
