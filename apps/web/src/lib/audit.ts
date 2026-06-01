import { pruneExpiredAuditLogs } from "@/lib/audit-log-query";
import type { AuditSectionId } from "@/lib/audit-sections";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

interface AuditParams {
  actorType: "club" | "player" | "system" | "admin";
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  section?: AuditSectionId;
  clubId?: string;
  summary?: string;
  payload?: Prisma.InputJsonValue;
}

export async function writeAuditLog(params: AuditParams) {
  const row = await prisma.auditLog.create({
    data: {
      appVersion: process.env.APP_VERSION ?? "0.1.0",
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      section: params.section,
      clubId: params.clubId,
      summary: params.summary,
      payload: params.payload ?? undefined,
    },
  });

  void pruneExpiredAuditLogs();
  return row;
}
