import { NextRequest, NextResponse } from "next/server";
import { AUDIT_RETENTION_DAYS, AUDIT_ACTION_LABELS, AUDIT_SECTION_LABELS, inferAuditSection, type AuditSectionId } from "@/lib/audit-sections";
import {
  augmentAuditChangeEntry,
  diffFloorPlanAuditLines,
  displayStoredAuditChange,
  formatAuditChanges,
  LABEL_TO_KEY,
  type AuditChangeEntry,
} from "@/lib/audit-club-diff";
import { listSectionAuditLogs } from "@/lib/audit-log-query";
import { authErrorResponse, requireSuperAdmin } from "@/lib/auth";
import { requireClubManageAccess } from "@/lib/club-manage";
import { prisma } from "@/lib/prisma";
import { BOOKING_TIMEZONE } from "@/lib/table-booking";

const SECTION_IDS = new Set<string>(Object.keys(AUDIT_SECTION_LABELS));

function formatWhen(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: BOOKING_TIMEZONE,
  }).format(date);
}

export async function GET(request: NextRequest) {
  try {
    const section = request.nextUrl.searchParams.get("section") ?? "";
    const clubId = request.nextUrl.searchParams.get("clubId");
    const context = request.nextUrl.searchParams.get("context") ?? "manage";

    if (!SECTION_IDS.has(section)) {
      return NextResponse.json({ error: "Неизвестный раздел" }, { status: 400 });
    }

    const sectionId = section as AuditSectionId;

    if (context === "admin") {
      await requireSuperAdmin();
      if (sectionId.startsWith("admin_") === false && !clubId) {
        return NextResponse.json({ error: "Укажите clubId для раздела клуба" }, { status: 400 });
      }
    } else {
      if (!clubId) {
        return NextResponse.json({ error: "Укажите clubId" }, { status: 400 });
      }
      await requireClubManageAccess(clubId);
    }

    const rows = await listSectionAuditLogs({
      section: sectionId,
      clubId: clubId ?? null,
    });

    const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))] as string[];
    const players =
      actorIds.length > 0
        ? await prisma.player.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, firstName: true, lastName: true, role: true },
          })
        : [];
    const playerMap = new Map(players.map((p) => [p.id, p]));

    const entries = rows.map((row) => {
      const player = row.actorId ? playerMap.get(row.actorId) : null;
      let actorLabel = "Система";
      if (row.actorType === "admin" || player?.role === "SUPERADMIN") {
        actorLabel = player
          ? `${player.lastName} ${player.firstName} (админ)`
          : "Администратор";
      } else if (player) {
        actorLabel = `${player.lastName} ${player.firstName}`;
      } else if (row.actorType === "club") {
        actorLabel = "Клуб";
      }

      const actionLabel = AUDIT_ACTION_LABELS[row.action] ?? row.action;

      const payload = row.payload as {
        changes?: Record<string, { from?: string; to?: string }>;
      } | null;

      const changeMap: Record<string, AuditChangeEntry> = {};
      if (payload?.changes) {
        for (const [k, v] of Object.entries(payload.changes)) {
          const raw = v as AuditChangeEntry & { from?: unknown; to?: unknown };
          const fieldKey = LABEL_TO_KEY[k];
          const sourceFrom = raw.rawFrom !== undefined ? raw.rawFrom : raw.from;
          const sourceTo = raw.rawTo !== undefined ? raw.rawTo : raw.to;

          let entry: AuditChangeEntry = {
            from: displayStoredAuditChange(k, String(raw.from ?? "—")),
            to: displayStoredAuditChange(k, String(raw.to ?? "—")),
            ...(Array.isArray(raw.diff) && raw.diff.length > 0 ? { diff: raw.diff } : {}),
            ...(Array.isArray(raw.fromParts) && raw.fromParts.length > 0
              ? { fromParts: raw.fromParts }
              : {}),
            ...(Array.isArray(raw.toParts) && raw.toParts.length > 0 ? { toParts: raw.toParts } : {}),
          };

          if (!entry.toParts?.length && fieldKey) {
            entry = augmentAuditChangeEntry(fieldKey, sourceFrom, sourceTo, entry);
          }

          if (!entry.diff?.length && k === "План зала") {
            const lines = diffFloorPlanAuditLines(sourceFrom, sourceTo);
            if (lines.length > 0) entry.diff = lines;
          }

          changeMap[k] = entry;
        }
      }

      const details =
        Object.keys(changeMap).length > 0
          ? formatAuditChanges(changeMap)
          : row.summary && row.summary !== "Изменения в профиле"
            ? row.summary
            : null;

      return {
        id: row.id,
        at: row.createdAt.toISOString(),
        atLabel: formatWhen(row.createdAt),
        actorLabel,
        action: row.action,
        actionLabel: typeof actionLabel === "string" ? actionLabel : row.action,
        summary: row.summary,
        details,
        changes: Object.keys(changeMap).length > 0 ? changeMap : null,
      };
    });

    return NextResponse.json({
      section: sectionId,
      sectionLabel: AUDIT_SECTION_LABELS[sectionId],
      retentionDays: AUDIT_RETENTION_DAYS,
      entries,
    });
  } catch (error) {
    const authResp = authErrorResponse(error);
    if (authResp) return authResp;
    return NextResponse.json({ error: "Не удалось загрузить журнал" }, { status: 500 });
  }
}
