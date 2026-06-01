import type { Prisma } from "@/generated/prisma/client";
import { AUDIT_RETENTION_DAYS, inferAuditSection, type AuditSectionId } from "@/lib/audit-sections";
import { prisma } from "@/lib/prisma";

export function auditRetentionSince(): Date {
  return new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function pruneExpiredAuditLogs(): Promise<void> {
  await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: auditRetentionSince() } },
  });
}

function legacySectionOr(
  section: AuditSectionId,
  clubId: string | null,
): Prisma.AuditLogWhereInput[] {
  const legacy: Prisma.AuditLogWhereInput[] = [{ section: null }];

  switch (section) {
    case "club":
      legacy.push({
        AND: [
          { entityType: "club" },
          ...(clubId ? [{ entityId: clubId }] : []),
          { action: { in: ["club.update", "club.create"] } },
        ],
      });
      break;
    case "staff":
      legacy.push({ action: { startsWith: "club_staff." } });
      break;
    case "bookings":
      legacy.push({
        OR: [
          { entityType: "table_booking" },
          { action: { startsWith: "table_booking." } },
        ],
      });
      break;
    case "players":
      legacy.push({
        OR: [
          { entityType: "club_player_rating" },
          { action: { startsWith: "club_player_rating." } },
        ],
      });
      break;
    case "news":
      legacy.push({
        OR: [{ entityType: "club_news" }, { action: { startsWith: "club_news." } }],
      });
      break;
    case "tournaments":
      legacy.push({
        OR: [{ entityType: "tournament" }, { action: { startsWith: "tournament." } }],
      });
      break;
    case "ideas":
      legacy.push({
        OR: [{ entityType: "idea" }, { action: { startsWith: "idea." } }],
      });
      break;
    case "admin_players":
      legacy.push({ action: { startsWith: "player." } });
      break;
    case "admin_clubs":
      legacy.push({
        OR: [{ action: { startsWith: "club." } }, { entityType: "club" }],
      });
      break;
    case "admin_tournaments":
      legacy.push({
        OR: [{ entityType: "tournament" }, { action: { startsWith: "tournament." } }],
      });
      break;
    default:
      break;
  }

  return legacy;
}

export async function listSectionAuditLogs(params: {
  section: AuditSectionId;
  clubId?: string | null;
  limit?: number;
}) {
  const since = auditRetentionSince();
  const limit = Math.min(params.limit ?? 200, 500);

  const sectionOr: Prisma.AuditLogWhereInput[] = [
    { section: params.section },
    ...legacySectionOr(params.section, params.clubId ?? null),
  ];

  const where: Prisma.AuditLogWhereInput = {
    createdAt: { gte: since },
    OR: sectionOr,
  };

  if (params.clubId) {
    where.AND = [
      {
        OR: [{ clubId: params.clubId }, { clubId: null, entityId: params.clubId }],
      },
    ];
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.filter((row) => {
    if (row.section === params.section) return true;
    const inferred = inferAuditSection(row.action, row.entityType);
    return inferred === params.section;
  });
}
