import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { countClubPendingPlayResponses } from "@/lib/play-listing-manage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: clubId } = await params;
    await requireClubManageAccess(clubId);
    const count = await countClubPendingPlayResponses(clubId);
    return NextResponse.json({ count });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось получить число откликов" }, { status: 500 });
  }
}
