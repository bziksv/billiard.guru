import { NextRequest, NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clubId } = await params;

  try {
    await requireClubManageAccess(clubId);

    const count = await prisma.tableBooking.count({
      where: {
        clubId,
        status: "PENDING",
        kind: { not: "BLOCK" },
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось получить число заявок" }, { status: 500 });
  }
}
