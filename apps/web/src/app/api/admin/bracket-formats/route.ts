import { NextResponse } from "next/server";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import {
  BRACKET_FORMAT_CATALOG,
  getBracketFormat,
  isBracketFormatCode,
} from "@/lib/bracket-formats/catalog";
import { prisma } from "@/lib/prisma";
import type { TournamentFormat } from "@/generated/prisma/enums";
import { resolveBracketParticipantRules } from "@/lib/bracket-participant-rules";
import {
  getBracketFormatCatalogLabel,
  resolveBracketFormatAdminLabel,
} from "@/lib/bracket-formats/resolve-label";
import {
  DEFAULT_BRACKET_FORMAT_SETTINGS,
  getAllBracketFormatSettings,
  resolveBracketFormatIsReference,
} from "@/lib/bracket-formats/settings-server";

function formatRow(
  f: (typeof BRACKET_FORMAT_CATALOG)[number],
  s: typeof DEFAULT_BRACKET_FORMAT_SETTINGS,
  countByFormat: Record<string, number>,
) {
  const catalogAdminLabel = getBracketFormatCatalogLabel(f.code);
  return {
    ...f,
    adminLabel: resolveBracketFormatAdminLabel(f.code, s),
    catalogAdminLabel,
    adminLabelOverride: s.adminLabel,
    tournamentCount: countByFormat[f.code] ?? 0,
    enabled: s.enabled,
    maintenanceMode: s.maintenanceMode,
    hiddenInAdmin: s.hiddenInAdmin,
    participantMin: s.participantMin,
    participantMax: s.participantMax,
    participantExact: s.participantExact,
    isReference: resolveBracketFormatIsReference(f.code, s),
    participantRules: resolveBracketParticipantRules(f.code, s),
  };
}

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const formatCode = searchParams.get("format");

    const [counts, settingsMap] = await Promise.all([
      prisma.tournament.groupBy({
        by: ["format"],
        where: { matches: { some: {} } },
        _count: { format: true },
      }),
      getAllBracketFormatSettings(),
    ]);
    const countByFormat = Object.fromEntries(
      counts.map((c) => [c.format, c._count.format]),
    );

    const formats = BRACKET_FORMAT_CATALOG.map((f) =>
      formatRow(
        f,
        settingsMap[f.code] ?? DEFAULT_BRACKET_FORMAT_SETTINGS,
        countByFormat,
      ),
    );

    if (formatCode && isBracketFormatCode(formatCode)) {
      const def = getBracketFormat(formatCode)!;
      const tournaments = await prisma.tournament.findMany({
        where: {
          format: formatCode as TournamentFormat,
          matches: { some: {} },
        },
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
      const s = settingsMap[formatCode] ?? DEFAULT_BRACKET_FORMAT_SETTINGS;
      return NextResponse.json({
        format: formatRow(def, s, countByFormat),
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
