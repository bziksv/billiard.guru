const styles: Record<string, string> = {
  PENDING: "bg-amber-900/50 text-amber-300",
  CONFIRMED: "bg-emerald-900/50 text-emerald-300",
  REJECTED: "bg-red-900/50 text-red-300",
  CANCELLED: "bg-zinc-700 text-zinc-300",
  DRAFT: "bg-zinc-700 text-zinc-300",
  OPEN: "bg-blue-900/50 text-blue-300",
  ACTIVE: "bg-emerald-900/50 text-emerald-300",
  FINISHED: "bg-zinc-600 text-zinc-200",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-zinc-700"}`}
    >
      {label}
    </span>
  );
}
