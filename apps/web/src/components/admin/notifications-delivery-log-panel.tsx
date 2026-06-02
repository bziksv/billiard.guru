"use client";

import { useCallback, useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { adminTabClass } from "@/lib/admin-ui";
import { cn } from "@/lib/cn";

type DeliveryEntry = {
  id: string;
  atLabel: string;
  notificationId: string | null;
  context: string;
  status: string;
  statusLabel: string;
  playerLabel: string | null;
  chatId: string | null;
  entityType: string | null;
  entityId: string | null;
  batchId: string | null;
  skipReasonLabel: string | null;
  errorMessage: string | null;
  messagePreview: string | null;
};

export function NotificationsDeliveryLogPanel({
  notificationTitles,
}: {
  notificationTitles: Record<string, string>;
}) {
  const [entries, setEntries] = useState<DeliveryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState(30);
  const [notificationId, setNotificationId] = useState("");
  const [status, setStatus] = useState("");
  const [entityId, setEntityId] = useState("");

  const notificationOptions = [
    { value: "", label: "Все типы" },
    ...Object.entries(notificationTitles).map(([value, label]) => ({ value, label })),
  ];

  const statusOptions = [
    { value: "", label: "Все статусы" },
    { value: "sent", label: "Отправлено" },
    { value: "failed", label: "Ошибка" },
    { value: "skipped", label: "Пропущено" },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (notificationId) qs.set("notificationId", notificationId);
    if (status) qs.set("status", status);
    if (entityId.trim()) {
      qs.set("entityType", "tournament");
      qs.set("entityId", entityId.trim());
    }
    qs.set("limit", "200");
    const res = await fetch(`/api/admin/notifications/delivery-log?${qs}`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Ошибка загрузки");
      return;
    }
    setRetentionDays(json.retentionDays ?? 30);
    setEntries(Array.isArray(json.entries) ? json.entries : []);
  }, [notificationId, status, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="admin-muted text-sm">
        Каждая попытка отправки Telegram: успех, ошибка API или пропуск с причиной (тестовый режим,
        отключено, нет TG). Хранение {retentionDays} дней.
      </p>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1">
          <SearchableSelect
            options={notificationOptions}
            value={notificationId}
            onChange={setNotificationId}
            placeholder="Тип уведомления"
            searchPlaceholder="Поиск…"
          />
        </div>
        <div className="min-w-[160px]">
          <SearchableSelect
            options={statusOptions}
            value={status}
            onChange={setStatus}
            placeholder="Статус"
            searchPlaceholder="Статус…"
          />
        </div>
        <input
          type="text"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          placeholder="ID турнира (entityId)"
          className="admin-input min-w-[200px] flex-1 text-sm"
        />
        <button type="button" onClick={() => void load()} className="admin-btn admin-btn--outline">
          Обновить
        </button>
      </div>

      {loading && <p className="admin-muted text-sm">Загрузка…</p>}
      {error && <p className="admin-error-text text-sm">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="admin-muted text-sm">Записей нет. Отфильтруйте или опубликуйте турнир.</p>
      )}

      {!loading && entries.length > 0 && (
        <div className="admin-table-wrap overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="admin-muted border-b border-[var(--admin-border)] text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 font-medium">Когда</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Игрок / chat</th>
                <th className="px-3 py-2 font-medium">Турнир / batch</th>
                <th className="px-3 py-2 font-medium">Причина / ошибка</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr
                  key={e.id}
                  className="admin-table-row border-t border-[var(--admin-border)] align-top"
                >
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap">{e.atLabel}</td>
                  <td className="px-3 py-2">
                    {e.notificationId
                      ? (notificationTitles[e.notificationId] ?? e.notificationId)
                      : e.context}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "admin-notify-chip",
                        e.status === "sent" && "!border-emerald-600 !bg-emerald-50 !text-emerald-800",
                        e.status === "failed" && "!border-red-400 !bg-red-50 !text-red-800",
                      )}
                    >
                      {e.statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div>{e.playerLabel ?? "—"}</div>
                    {e.chatId && (
                      <div className="admin-muted font-mono text-xs">{e.chatId}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {e.entityId && <div>{e.entityId}</div>}
                    {e.batchId && (
                      <div className="admin-muted truncate max-w-[140px]" title={e.batchId}>
                        batch: {e.batchId.slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="admin-muted max-w-xs px-3 py-2 text-xs leading-relaxed">
                    {e.skipReasonLabel && <div>{e.skipReasonLabel}</div>}
                    {e.errorMessage && <div className="text-red-600">{e.errorMessage}</div>}
                    {e.messagePreview && !e.skipReasonLabel && !e.errorMessage && (
                      <div className="truncate">{e.messagePreview}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
