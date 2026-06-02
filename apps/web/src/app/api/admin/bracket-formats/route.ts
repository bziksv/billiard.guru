import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  BRACKET_FORMAT_CATALOG,
  getBracketFormat,
  isBracketFormatCode,
} from "@/lib/bracket-formats/catalog";
import { prisma } from "@/lib/prisma";
import { getAllBracketFormatSettings } from "@/lib/bracket-formats/settings-server";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const formatCode = searchParams.get("format");

    const [counts, settingsMap] = await Promise.all([
      prisma.tournament.groupBy({
        by: ["format"],
        _count: { format: true },
      }),
      getAllBracketFormatSettings(),
    ]);
    const countByFormat = Object.fromEntries(
      counts.map((c) => [c.format, c._count.format]),
    );

    const formats = BRACKET_FORMAT_CATALOG.map((f) => {
      const s = settingsMap[f.code] ?? { enabled: true, maintenanceMode: false };
      return {
        ...f,
        tournamentCount: countByFormat[f.code] ?? 0,
        enabled: s.enabled,
        maintenanceMode: s.maintenanceMode,
      };
    });

    if (formatCode && isBracketFormatCode(formatCode)) {
      const def = getBracketFormat(formatCode)!;
      const tournaments = await prisma.tournament.findMany({
        where: { format: formatCode },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          status: true,
          updatedAt: true,
          club: { select: { name: true } },
          _count: { select: { matches: true } },
        },
      });
      return NextResponse.json({
        format: {
          ...def,
          tournamentCount: countByFormat[formatCode] ?? 0,
          enabled: settingsMap[formatCode]?.enabled ?? true,
          maintenanceMode: settingsMap[formatCode]?.maintenanceMode ?? false,
        },
        tournaments: tournaments.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          clubName: t.club.name,
          matchCount: t._count.matches,
          updatedAt: t.updatedAt.toISOString(),
        })),
      });
    }

    return NextResponse.json({ formats });
  } catch (error) {
    const res = authErrorResponse(error);
    if (res) return res;
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
