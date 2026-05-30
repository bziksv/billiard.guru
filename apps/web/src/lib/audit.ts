import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

interface AuditParams {
  actorType: "club" | "player" | "system" | "admin";
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Prisma.InputJsonValue;
}

export async function writeAuditLog(params: AuditParams) {
  return prisma.auditLog.create({
    data: {
      appVersion: process.env.APP_VERSION ?? "0.1.0",
      actorType: params.actorType,
      actorId: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload ?? undefined,
    },
  });
}
