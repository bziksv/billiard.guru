"use client";

import { useCallback, useState } from "react";
import type { AuditChangePart } from "@/lib/audit-club-diff";
import { AUDIT_RETENTION_DAYS } from "@/lib/audit-sections";
import type { AuditSectionId } from "@/lib/audit-sections";

type LogEntry = {
  id: string;
  atLabel: string;
  actorLabel: string;
  actionLabel: string;
  details: string | null;
  summary: string | null;
  changes: Record<string, { from: string; to: string; diff?: string[]; fromParts?: AuditChangePart[]; toParts?: AuditChangePart[] }> | null;
};

function AuditChangeValue({
  parts,
  fallback,
  highlightChanged = false,
}: {
  parts?: AuditChangePart[];
  fallback: string;
  highlightChanged?: boolean;
}) {
  if (parts && parts.length > 0) {
    return (
      <>
        {parts.map((part, index) => (
          <span key={`${part.text}-${index}`}>
            {index > 0 && "; "}
            {highlightChanged && part.changed ? (
              <mark className="audit-change-highlight">{part.text}</mark>
            ) : (
              part.text
            )}
          </span>
        ))}
      </>
    );
  }

  if (highlightChanged && fallback !== "—" && fallback !== "без изменений") {
    return <mark className="audit-change-highlight">{fallback}</mark>;
  }

  return <>{fallback}</>;
}

function AuditChangeDetails({
  changes,
}: {
  changes: Record<string, { from: string; to: string; diff?: string[]; fromParts?: AuditChangePart[]; toParts?: AuditChangePart[] }>;
}) {
  return (
    <ul className="list-none space-y-2">
      {Object.entries(changes).map(([field, v]) => (
        <li key={field}>
          <div className="font-medium text-[var(--admin-fg)]">{field}</div>
          <div>
            <span className="text-[var(--admin-muted)]">было:</span>{" "}
            <AuditChangeValue parts={v.fromParts} fallback={v.from} />
          </div>
          <div>
            <span className="text-[var(--admin-muted)]">стало:</span>{" "}
            <AuditChangeValue parts={v.toParts} fallback={v.to} highlightChanged />
          </div>
          {v.diff && v.diff.length > 0 && !v.toParts?.length && (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[var(--admin-fg)]">
              {v.diff.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SectionLogsButton({
  section,
  clubId,
  context = "manage",
  className,
}: {
  section: AuditSectionId;
  clubId?: string;
  context?: "manage" | "admin";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectionLabel, setSectionLabel] = useState("");
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ section, context });
    if (clubId) qs.set("clubId", clubId);
    const res = await fetch(`/api/audit-logs?${qs}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось загрузить");
      return;
    }
    setSectionLabel(data.sectionLabel ?? "");
    setEntries(Array.isArray(data.entries) ? data.entries : []);
  }, [section, clubId, context]);

  function openModal() {
    setOpen(true);
    void load();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={
          className ??
          "admin-btn admin-btn--outline rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-600"
        }
      >
        Логи раздела
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="section-logs-title"
        >
          <div className="admin-card flex max-h-[85vh] w-full max-w-3xl flex-col shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-4">
              <div>
                <h2 id="section-logs-title" className="text-lg font-semibold">
                  Логи раздела
                </h2>
                <p className="admin-muted mt-0.5 text-sm">
                  {sectionLabel || section} · хранение {AUDIT_RETENTION_DAYS} дней
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="admin-btn admin-btn--outline shrink-0"
              >
                Закрыть
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading && <p className="admin-muted text-sm">Загрузка…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {!loading && !error && entries.length === 0 && (
                <p className="admin-muted text-sm">За последние {AUDIT_RETENTION_DAYS} дней записей нет.</p>
              )}
              {!loading && entries.length > 0 && (
                <div className="admin-table-wrap overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="admin-thead">
                      <tr>
                        <th className="px-3 py-2 text-left whitespace-nowrap">Когда</th>
                        <th className="px-3 py-2 text-left">Кто</th>
                        <th className="px-3 py-2 text-left">Действие</th>
                        <th className="px-3 py-2 text-left">Детали</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map((e) => (
                        <tr key={e.id} className="admin-table-row">
                          <td className="px-3 py-2 tabular-nums whitespace-nowrap">{e.atLabel}</td>
                          <td className="px-3 py-2">{e.actorLabel}</td>
                          <td className="px-3 py-2">{e.actionLabel}</td>
                          <td className="admin-muted max-w-md px-3 py-2 text-xs leading-relaxed">
                            {e.changes && Object.keys(e.changes).length > 0 ? (
                              <AuditChangeDetails changes={e.changes} />
                            ) : (
                              e.details || e.summary || "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--admin-border)] px-5 py-3">
              <button type="button" onClick={() => void load()} className="admin-btn admin-btn--outline text-xs">
                Обновить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
