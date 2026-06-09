const STATUS_CLASS: Record<string, string> = {
  PENDING: "status-badge--pending",
  CONFIRMED: "status-badge--confirmed",
  REJECTED: "status-badge--rejected",
  UNPUBLISHED: "status-badge--neutral",
  APPROVED: "status-badge--confirmed",
  CANCELLED: "status-badge--neutral",
  DRAFT: "status-badge--neutral",
  OPEN: "status-badge--open",
  ACTIVE: "status-badge--active",
  FINISHED: "status-badge--finished",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <span className={`status-badge ${STATUS_CLASS[status] ?? "status-badge--neutral"}`}>
      {label}
    </span>
  );
}
