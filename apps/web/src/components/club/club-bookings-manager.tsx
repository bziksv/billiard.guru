"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { AdminFilterSelect } from "@/components/admin/admin-table-toolbar";
import { BlockSlotModal, ManualBookingModal } from "@/components/club/bookings/booking-modals";
import type { CalendarBooking, CalendarPayload, StatusFilter, ViewMode } from "@/components/club/bookings/types";
import {
  addDaysToKey,
  formatBookingTimeRange,
  formatCalendarDayHeader,
  todayDayKey,
} from "@/lib/club-bookings-calendar";
import {
  buildDayTimelineMinutes,
  formatMinuteLabel,
  isClubOpenOnDay,
} from "@/lib/club-bookings-open-hours";
import { exportBookingsCsv, exportBookingsPrintHtml } from "@/lib/club-bookings-stats";
import { bookingFormatLabel, formatBookingTableCaption } from "@/lib/table-booking";
import { REGISTRATION_STATUS_LABELS } from "@/lib/validators";
import { dispatchClubPendingBookings } from "@/lib/club-pending-bookings-badge";
import { cn } from "@/lib/cn";

const VISIBLE_DAYS = 7;

function ActionButton({
  variant,
  onClick,
  children,
  loadingLabel,
  disabled,
}: {
  variant: "primary" | "danger" | "outline";
  onClick: () => void | Promise<void>;
  children: ReactNode;
  loadingLabel?: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={async () => {
        setLoading(true);
        try {
          await onClick();
        } finally {
          setLoading(false);
        }
      }}
      className={cn(
        "admin-btn",
        variant === "primary" && "admin-btn--primary",
        variant === "danger" && "admin-btn--danger",
        variant === "outline" && "admin-btn--outline",
      )}
    >
      {loading && (
        <span className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {loading ? (loadingLabel ?? "…") : children}
    </button>
  );
}

function filterBookings(
  list: CalendarBooking[],
  statusFilter: StatusFilter,
  formatFilter: string,
): CalendarBooking[] {
  return list.filter((b) => {
    if (formatFilter && b.tableFormat !== formatFilter) return false;
    if (statusFilter === "pending") return b.status === "PENDING";
    if (statusFilter === "confirmed") return b.status === "CONFIRMED" && b.kind !== "BLOCK";
    if (statusFilter === "block") return b.kind === "BLOCK";
    return true;
  });
}

function chipClass(booking: CalendarBooking, selected: boolean) {
  if (booking.kind === "BLOCK") return cn("bookings-chip bookings-chip--block", selected && "bookings-chip--selected");
  if (booking.status === "PENDING") return cn("bookings-chip bookings-chip--pending", selected && "bookings-chip--selected");
  return cn("bookings-chip bookings-chip--confirmed", selected && "bookings-chip--selected");
}

function BookingDetailPanel({
  booking,
  clubId,
  onClose,
  onUpdated,
}: {
  booking: CalendarBooking;
  clubId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [clubNote, setClubNote] = useState(booking.clubNote ?? "");

  async function setStatus(status: "CONFIRMED" | "REJECTED" | "CANCELLED") {
    setError(null);
    const res = await fetch(`/api/clubs/${clubId}/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    onUpdated();
    onClose();
  }

  async function saveNote() {
    const res = await fetch(`/api/clubs/${clubId}/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubNote: clubNote.trim() || null }),
    });
    if (res.ok) onUpdated();
  }

  const tg = booking.displayPhone
    ? `https://t.me/+${booking.displayPhone.replace(/\D/g, "")}`
    : null;

  return (
    <div className="bookings-detail">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{booking.displayName}</p>
          <p className="mt-0.5 text-sm admin-text-secondary">{booking.displayPhone || "—"}</p>
        </div>
        <StatusBadge
          status={booking.kind === "BLOCK" ? "CANCELLED" : booking.status}
          label={
            booking.kind === "BLOCK"
              ? "Блокировка"
              : (REGISTRATION_STATUS_LABELS[booking.status] ?? booking.status)
          }
        />
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 admin-muted">Стол</dt>
          <dd>
            <BookingTableCell
              tableFormat={booking.tableFormat}
              floorTableLabel={booking.floorTableLabel}
              floorItemId={booking.floorItemId}
            />
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 admin-muted">Время</dt>
          <dd className="tabular-nums">{formatBookingTimeRange(booking.startsAt, booking.endsAt)}</dd>
        </div>
        {booking.playerNote && (
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 admin-muted">Гость</dt>
            <dd>«{booking.playerNote}»</dd>
          </div>
        )}
      </dl>
      {booking.kind !== "BLOCK" && (
        <label className="mt-3 block text-sm">
          <span className="admin-label-xs mb-1 block">Заметка клуба</span>
          <textarea
            value={clubNote}
            onChange={(e) => setClubNote(e.target.value)}
            rows={2}
            className="admin-input w-full text-sm"
          />
          <button type="button" onClick={() => void saveNote()} className="admin-btn admin-btn--outline mt-2 text-xs">
            Сохранить заметку
          </button>
        </label>
      )}
      {booking.displayPhone && (
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`tel:${booking.displayPhone}`} className="admin-btn admin-btn--outline">
            Позвонить
          </a>
          {tg && (
            <a href={tg} target="_blank" rel="noreferrer" className="admin-btn admin-btn--outline">
              Telegram
            </a>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="bookings-detail-actions">
        {booking.status === "PENDING" && booking.kind !== "BLOCK" && (
          <div className="bookings-detail-actions__row">
            <ActionButton variant="primary" onClick={() => setStatus("CONFIRMED")} loadingLabel="…">
              Подтвердить
            </ActionButton>
            <ActionButton variant="danger" onClick={() => setStatus("REJECTED")} loadingLabel="…">
              Отклонить
            </ActionButton>
          </div>
        )}
        {booking.kind !== "BLOCK" &&
          (booking.status === "PENDING" || booking.status === "CONFIRMED") && (
            <ActionButton variant="outline" onClick={() => setStatus("CANCELLED")} loadingLabel="…">
              Отменить
            </ActionButton>
          )}
        <button type="button" onClick={onClose} className="admin-btn admin-btn--outline">
          Закрыть
        </button>
      </div>
    </div>
  );
}

function BookingTableCell({
  tableFormat,
  floorTableLabel,
  floorItemId,
}: {
  tableFormat: string;
  floorTableLabel: string | null;
  floorItemId: string | null;
}) {
  const { title, hint } = formatBookingTableCaption(tableFormat, floorTableLabel, floorItemId);
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-xs admin-muted">{hint}</p>
    </div>
  );
}

export function ClubBookingsManager({ clubId }: { clubId: string }) {
  const [fromDay, setFromDay] = useState(todayDayKey);
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formatFilter, setFormatFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [dayViewKey, setDayViewKey] = useState(todayDayKey);
  const [showManual, setShowManual] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const pendingRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(
      `/api/clubs/${clubId}/bookings?calendar=1&from=${encodeURIComponent(fromDay)}&days=${VISIBLE_DAYS}&includeHistory=1`,
    );
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Не удалось загрузить расписание");
      return;
    }
    const payload = json as CalendarPayload;
    setData(payload);
    dispatchClubPendingBookings({ clubId, count: payload.stats.pending });
  }, [clubId, fromDay]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = window.setInterval(() => void load(), 90_000);
    return () => window.clearInterval(t);
  }, [load]);

  const filtered = useMemo(
    () => (data ? filterBookings(data.bookings, statusFilter, formatFilter) : []),
    [data, statusFilter, formatFilter],
  );

  const bookingsByCell = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of filtered) {
      const key = `${b.tableRowId}|${b.dayKey}`;
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const pendingBookings = useMemo(
    () => data?.bookings.filter((b) => b.status === "PENDING") ?? [],
    [data],
  );

  const todayBookings = useMemo(() => {
    const t = todayDayKey();
    return (data?.bookings ?? [])
      .filter((b) => b.dayKey === t)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [data]);

  const selectedBooking = useMemo(
    () => data?.bookings.find((b) => b.id === selectedId) ?? null,
    [data, selectedId],
  );

  const weekLabel = useMemo(() => {
    if (!data?.days.length) return "";
    return `${formatCalendarDayHeader(data.days[0]!)} — ${formatCalendarDayHeader(data.days[data.days.length - 1]!)}`;
  }, [data]);

  function shiftWeek(delta: number) {
    setFromDay((d) => addDaysToKey(d, delta * VISIBLE_DAYS));
    setSelectedId(null);
  }

  function exportRows() {
    if (!data) return [];
    return [...data.bookings, ...data.history].map((b) => ({
      guest: b.displayName,
      phone: b.displayPhone,
      table: formatBookingTableCaption(b.tableFormat, b.floorTableLabel, b.floorItemId).title,
      date: formatCalendarDayHeader(b.dayKey),
      time: formatBookingTimeRange(b.startsAt, b.endsAt),
      status: REGISTRATION_STATUS_LABELS[b.status] ?? b.status,
      kind: b.kind,
      note: [b.playerNote, b.clubNote].filter(Boolean).join(" / "),
    }));
  }

  function exportCsv() {
    const rows = exportRows();
    if (!rows.length) return;
    const blob = new Blob([exportBookingsCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${fromDay}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const rows = exportRows();
    if (!rows.length) return;
    const html = exportBookingsPrintHtml(`Брони столов · ${weekLabel || fromDay}`, rows);
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  if (loading && !data) {
    return <p className="admin-muted text-sm">Загрузка расписания…</p>;
  }

  return (
    <div className="club-bookings-manager space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="primary" onClick={() => setShowManual(true)}>
              + Ручная бронь
            </ActionButton>
            <ActionButton variant="outline" onClick={() => setShowBlock(true)}>
              Заблокировать стол
            </ActionButton>
            <ActionButton variant="outline" onClick={load} loadingLabel="…">
              Обновить
            </ActionButton>
            <ActionButton variant="outline" onClick={exportCsv}>
              Экспорт CSV
            </ActionButton>
            <ActionButton variant="outline" onClick={exportPdf}>
              Печать / PDF
            </ActionButton>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <button
              type="button"
              className={cn("bookings-stat bookings-stat--pending bookings-stat--clickable text-left")}
              onClick={() => {
                setStatusFilter("pending");
                pendingRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <p className="bookings-stat__label">Ожидают</p>
              <p className="bookings-stat__value">{data.stats.pending}</p>
            </button>
            <div className="bookings-stat bookings-stat--confirmed">
              <p className="bookings-stat__label">Сегодня</p>
              <p className="bookings-stat__value">{data.stats.confirmedToday}</p>
            </div>
            <div className="bookings-stat bookings-stat--week">
              <p className="bookings-stat__label">На неделе</p>
              <p className="bookings-stat__value">{data.stats.confirmedInRange}</p>
            </div>
            <div className="bookings-stat bookings-stat--neutral">
              <p className="bookings-stat__label">Столов</p>
              <p className="bookings-stat__value">{data.stats.tablesCount}</p>
            </div>
            <div className="bookings-stat bookings-stat--neutral">
              <p className="bookings-stat__label">Блокировок</p>
              <p className="bookings-stat__value">{data.stats.blocksCount}</p>
            </div>
            <div className="bookings-stat bookings-stat--week">
              <p className="bookings-stat__label">Загрузка</p>
              <p className="bookings-stat__value">{data.stats.utilizationPercent}%</p>
              <p className="bookings-stat__hint">Пик: {data.stats.peakHourLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <AdminFilterSelect
              label="Статус"
              options={[
                { value: "all", label: "Все" },
                { value: "pending", label: "Ожидают" },
                { value: "confirmed", label: "Подтверждённые" },
                { value: "block", label: "Блокировки" },
              ]}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
            />
            <AdminFilterSelect
              label="Формат"
              options={[
                { value: "", label: "Все" },
                ...Array.from(new Set(data.tables.map((t) => t.tableFormat))).map((id) => ({
                  value: id,
                  label: bookingFormatLabel(id),
                })),
              ]}
              value={formatFilter}
              onChange={setFormatFilter}
            />
            <div className="flex gap-1 rounded-lg border border-[var(--admin-border)] p-1">
              {(["week", "day", "today"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    viewMode === m
                      ? "bg-emerald-600 text-white"
                      : "admin-text-secondary hover:bg-[var(--admin-row-hover)]",
                  )}
                >
                  {m === "week" ? "Неделя" : m === "day" ? "День" : "Сегодня"}
                </button>
              ))}
            </div>
          </div>

          {viewMode === "today" && (
            <div className="grid gap-6 xl:grid-cols-[1fr_minmax(260px,300px)]">
              <section className="admin-card p-4">
                <h2 className="text-lg font-semibold">Сегодня на стойке</h2>
                {todayBookings.length === 0 ? (
                  <p className="admin-muted mt-2 text-sm">На сегодня броней нет.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {todayBookings.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(b.id)}
                          className={cn(
                            "w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-left text-sm hover:bg-[var(--admin-row-hover)]",
                            selectedId === b.id && "ring-2 ring-emerald-500/50",
                          )}
                        >
                          <span className="font-medium">{formatBookingTimeRange(b.startsAt, b.endsAt)}</span>
                          {" · "}
                          {b.displayName}
                          {" · "}
                          {formatBookingTableCaption(b.tableFormat, b.floorTableLabel, b.floorItemId).title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <BookingsDetailAside
                booking={selectedBooking}
                clubId={clubId}
                onClose={() => setSelectedId(null)}
                onUpdated={() => void load()}
              />
            </div>
          )}

          {viewMode === "week" && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="admin-muted text-sm">Недельная сетка. Серые колонки — клуб закрыт.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => shiftWeek(-1)} className="admin-btn admin-btn--outline">
                    ← Неделя
                  </button>
                  <span className="min-w-[10rem] text-center text-sm font-medium admin-text-secondary">
                    {weekLabel}
                  </span>
                  <button type="button" onClick={() => shiftWeek(1)} className="admin-btn admin-btn--outline">
                    Неделя →
                  </button>
                  <button type="button" onClick={() => { setFromDay(todayDayKey()); setSelectedId(null); }} className="admin-btn admin-btn--primary">
                    Сегодня
                  </button>
                </div>
              </div>
              <div className="grid gap-6 xl:grid-cols-[1fr_minmax(260px,300px)]">
                <div className="admin-table-wrap min-w-0 overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-sm">
                    <thead className="bookings-cal-thead">
                      <tr>
                        <th className="bookings-cal-sticky min-w-[11rem] px-3 py-2 text-left">Стол</th>
                        {data.days.map((day) => {
                          const closed = data.closedDays.includes(day);
                          return (
                            <th
                              key={day}
                              className={cn(
                                "min-w-[5.5rem] px-1 py-2 text-center text-xs",
                                day === todayDayKey() && !closed && "bookings-cal-th-today",
                                closed && "bookings-cal-th-closed",
                              )}
                            >
                              {formatCalendarDayHeader(day)}
                              {closed && <span className="block text-[10px]">закрыто</span>}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {data.tables.map((table) => (
                        <tr key={table.id} className="admin-table-row">
                          <td className="bookings-cal-sticky px-3 py-2 font-medium" title={table.label}>
                            <span className="block max-w-[11rem] truncate">{table.label}</span>
                          </td>
                          {data.days.map((day) => {
                            const closed = data.closedDays.includes(day);
                            const cellBookings = bookingsByCell.get(`${table.id}|${day}`) ?? [];
                            return (
                              <td
                                key={day}
                                className={cn(
                                  "align-top px-1 py-1.5",
                                  day === todayDayKey() && !closed && "bookings-cal-td-today",
                                  closed && "bookings-cal-td-closed",
                                )}
                              >
                                {cellBookings.length === 0 ? (
                                  <span className="bookings-cal-empty">—</span>
                                ) : (
                                  cellBookings.map((b) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      onClick={() => setSelectedId(b.id)}
                                      className={chipClass(b, selectedId === b.id)}
                                    >
                                      <span className="block font-medium tabular-nums">
                                        {formatBookingTimeRange(b.startsAt, b.endsAt)}
                                      </span>
                                      <span className="mt-0.5 block truncate opacity-90">
                                        {b.displayName}
                                      </span>
                                    </button>
                                  ))
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <BookingsDetailAside
                  booking={selectedBooking}
                  clubId={clubId}
                  onClose={() => setSelectedId(null)}
                  onUpdated={() => void load()}
                />
              </div>
            </>
          )}

          {viewMode === "day" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm">
                  <span className="admin-label-xs mb-1 block">День</span>
                  <input
                    type="date"
                    value={dayViewKey}
                    onChange={(e) => setDayViewKey(e.target.value)}
                    className="admin-input"
                  />
                </label>
                {!isClubOpenOnDay(data.weeklyHours, data.workingHours, dayViewKey) && (
                  <span className="text-sm text-amber-600">Клуб закрыт в этот день</span>
                )}
              </div>
              <div className="grid gap-6 xl:grid-cols-[1fr_minmax(260px,300px)]">
                <DayTimelineView
                  data={data}
                  dayKey={dayViewKey}
                  bookings={filtered.filter((b) => b.dayKey === dayViewKey)}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                <BookingsDetailAside
                  booking={selectedBooking}
                  clubId={clubId}
                  onClose={() => setSelectedId(null)}
                  onUpdated={() => void load()}
                />
              </div>
            </div>
          )}

          <section id="bookings-pending-section" ref={pendingRef} className="scroll-mt-4 space-y-3">
            <h2 className="text-lg font-semibold">
              Заявки на подтверждение
              {pendingBookings.length > 0 && (
                <span className="bookings-section-count ml-2">({pendingBookings.length})</span>
              )}
            </h2>
            {/* pending table - same as before */}
            {pendingBookings.length === 0 ? (
              <p className="admin-muted text-sm">Нет ожидающих заявок.</p>
            ) : (
              <div className="admin-table-wrap overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="admin-thead">
                    <tr>
                      <th className="px-3 py-2 text-left">Игрок</th>
                      <th className="px-3 py-2 text-left">Стол / формат</th>
                      <th className="px-3 py-2 text-left">Дата и время</th>
                      <th className="px-3 py-2 text-left">Телефон</th>
                      <th className="px-3 py-2 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBookings.map((b) => (
                      <tr key={b.id} className={cn("admin-table-row", selectedId === b.id && "bookings-pending-row--selected")}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{b.displayName}</p>
                          <button type="button" className="admin-btn admin-btn--outline mt-1.5" onClick={() => setSelectedId(b.id)}>
                            Открыть
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <BookingTableCell tableFormat={b.tableFormat} floorTableLabel={b.floorTableLabel} floorItemId={b.floorItemId} />
                        </td>
                        <td className="admin-text-secondary px-3 py-2 tabular-nums">
                          {formatCalendarDayHeader(b.dayKey)}, {formatBookingTimeRange(b.startsAt, b.endsAt)}
                        </td>
                        <td className="admin-muted px-3 py-2">{b.displayPhone}</td>
                        <td className="px-3 py-2">
                          <div className="bookings-row-actions">
                            <ActionButton variant="primary" onClick={async () => {
                              await fetch(`/api/clubs/${clubId}/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CONFIRMED" }) });
                              await load();
                            }}>Подтвердить</ActionButton>
                            <ActionButton variant="danger" onClick={async () => {
                              await fetch(`/api/clubs/${clubId}/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "REJECTED" }) });
                              await load();
                            }}>Отклонить</ActionButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {data.history.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">История (30 дней)</h2>
              <div className="admin-table-wrap overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="admin-thead">
                    <tr>
                      <th className="px-3 py-2 text-left">Гость</th>
                      <th className="px-3 py-2 text-left">Стол</th>
                      <th className="px-3 py-2 text-left">Время</th>
                      <th className="px-3 py-2 text-left">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.history.map((b) => (
                      <tr key={b.id} className="admin-table-row">
                        <td className="px-3 py-2">{b.displayName}</td>
                        <td className="px-3 py-2">
                          <BookingTableCell tableFormat={b.tableFormat} floorTableLabel={b.floorTableLabel} floorItemId={b.floorItemId} />
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatCalendarDayHeader(b.dayKey)}, {formatBookingTimeRange(b.startsAt, b.endsAt)}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge status={b.status} label={REGISTRATION_STATUS_LABELS[b.status] ?? b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {showManual && data && (
        <ManualBookingModal
          clubId={clubId}
          tables={data.tables}
          defaultDay={todayDayKey()}
          slotMinutes={data.slotMinutes}
          onClose={() => setShowManual(false)}
          onCreated={() => void load()}
        />
      )}
      {showBlock && data && (
        <BlockSlotModal
          clubId={clubId}
          tables={data.tables}
          defaultDay={todayDayKey()}
          slotMinutes={data.slotMinutes}
          onClose={() => setShowBlock(false)}
          onCreated={() => void load()}
        />
      )}
    </div>
  );
}

function BookingsDetailAside({
  booking,
  clubId,
  onClose,
  onUpdated,
}: {
  booking: CalendarBooking | null;
  clubId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  return (
    <aside className="space-y-4">
      {booking ? (
        <BookingDetailPanel booking={booking} clubId={clubId} onClose={onClose} onUpdated={onUpdated} />
      ) : (
        <div className="bookings-aside-empty">Выберите бронь в таблице.</div>
      )}
    </aside>
  );
}

function DayTimelineView({
  data,
  dayKey,
  bookings,
  selectedId,
  onSelect,
}: {
  data: CalendarPayload;
  dayKey: string;
  bookings: CalendarBooking[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const timeline = buildDayTimelineMinutes(
    data.weeklyHours,
    data.workingHours,
    dayKey,
    data.slotMinutes,
  );
  if (timeline.closed) {
    return <p className="admin-muted text-sm">В этот день клуб не работает ({timeline.openLabel}).</p>;
  }

  return (
    <div className="admin-table-wrap overflow-x-auto">
      <table className="w-full min-w-[800px] text-xs">
        <thead className="bookings-cal-thead">
          <tr>
            <th className="bookings-cal-sticky min-w-[9rem] px-2 py-2 text-left">Стол</th>
            {timeline.minutes.map((m) => (
              <th key={m} className="min-w-[3rem] px-0.5 py-1 text-center font-normal">
                {formatMinuteLabel(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.tables.map((table) => (
            <tr key={table.id} className="admin-table-row">
              <td className="bookings-cal-sticky px-2 py-1 font-medium">{table.label}</td>
              {timeline.minutes.map((min) => {
                const slotStart = new Date(`${dayKey}T${formatMinuteLabel(min)}:00+03:00`);
                const slotEnd = new Date(slotStart.getTime() + data.slotMinutes * 60_000);
                const hit = bookings.find(
                  (b) =>
                    b.tableRowId === table.id &&
                    new Date(b.startsAt) < slotEnd &&
                    new Date(b.endsAt) > slotStart,
                );
                return (
                  <td key={min} className="p-0.5">
                    {hit ? (
                      <button
                        type="button"
                        onClick={() => onSelect(hit.id)}
                        className={cn("h-7 w-full rounded", chipClass(hit, selectedId === hit.id))}
                        title={hit.displayName}
                      />
                    ) : (
                      <span className="block h-7" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
