import type { ReactNode } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import type { AuditSectionId } from "@/lib/audit-sections";

export function ManageSectionHeader({
  title,
  lead,
  clubId,
  section,
  context = "manage",
  children,
}: {
  title: string;
  lead?: string;
  clubId: string;
  section: AuditSectionId;
  context?: "manage" | "admin";
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="admin-page-title text-2xl">{title}</h1>
        {lead && <p className="admin-page-lead mt-2 max-w-2xl text-sm">{lead}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SectionLogsButton section={section} clubId={clubId} context={context} />
        {children}
      </div>
    </div>
  );
}
