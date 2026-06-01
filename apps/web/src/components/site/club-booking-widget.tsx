"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClubFloorPlanCanvas } from "@/components/club/club-floor-plan-canvas";
import {
  type FloorTableAvailability,
} from "@/lib/floor-plan-booking";
import { parseFloorPlan } from "@/lib/club-floor-plan";
import { parsePriceTiers } from "@/lib/club-schedule";
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import {
  bookingDateOptions,
  bookingEndsAt,
  clubBookingFormatEntries,
  formatBookingDuration,
  type BookingSlotOffer,
} from "@/lib/table-booking";

type ClubBookingWidgetProps = {
  clubId: string;
  clubName: string;
  bookingEnabled: boolean;
  bookingAdvanceDays: number;
  tableCounts: unknown;
  floorPlan: unknown;
  priceTiers?: unknown;
  isLoggedIn: boolean;
};

export function ClubBookingWidget({
  clubId,
  clubName,
  bookingEnabled,
  bookingAdvanceDays,
  tableCounts,
  floorPlan,
  priceTiers: priceTiersRaw,
  isLoggedIn,
}: ClubBookingWidgetProps) {
  const router = useRouter();
  const plan = useMemo(() => parseFloorPlan(floorPlan), [floorPlan]);
  const priceTiers = useMemo(() => parsePriceTiers(priceTiersRaw), [priceTiersRaw]);
  const formats = useMemo(
    () => clubBookingFormatEntries(tableCounts, floorPlan),
    [tableCounts, floorPlan],
  );
  const dates = useMemo(
    () => bookingDateOptions(bookingAdvanceDays),
    [bookingAdvanceDays],
  );

  const [format, setFormat] = useState<ClubTableFormatId | "">("");
  const [date, setDate] = useState("");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [slots, setSlots] = useState<BookingSlotOffer[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [durationOptions, setDurationOptions] = useState<number[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [floorTables, setFloorTables] = useState<FloorTableAvailability[]>([]);
  const [hasFloorPlan, setHasFloorPlan] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingSlotDetails, setLoadingSlotDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const endsAtIso = useMemo(() => {
    if (!selectedSlot || !durationMinutes) return null;
    return bookingEndsAt(new Date(selectedSlot), durationMinutes).toISOString();
  }, [selectedSlot, durationMinutes]);

  useEffect(() => {
    if (formats.length > 0 && !format) setFormat(formats[0]!.id);
    if (dates.length > 0 && !date) setDate(dates[0]!.value);
  }, [formats, dates, format, date]);

  const loadSlots = useCallback(async () => {
    if (!format || !date) return;
    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);
    setSelectedTableId(null);
    setDurationOptions([]);
    setDurationMinutes(null);
    setFloorTables([]);
    const res = await fetch(
      `/api/clubs/${clubId}/bookings?date=${encodeURIComponent(date)}&format=${encodeURIComponent(format)}`,
    );
    const data = await res.json();
    setLoadingSlots(false);
    if (!res.ok) {
      setSlots([]);
      setError(data.error ?? "Не удалось загрузить слоты");
      return;
    }
    setSlots(Array.isArray(data.slots) ? data.slots : []);
    setHasFloorPlan(Boolean(data.hasFloorPlan));
    if (typeof data.slotMinutes === "number") setSlotMinutes(data.slotMinutes);
  }, [clubId, date, format]);

  const loadSlotDetails = useCallback(async () => {
    if (!format || !date || !selectedSlot) {
      setDurationOptions([]);
      setDurationMinutes(null);
      setFloorTables([]);
      return;
    }

    setLoadingSlotDetails(true);
    const params = new URLSearchParams({
      date,
      format,
      startsAt: selectedSlot,
    });

    const res = await fetch(`/api/clubs/${clubId}/bookings?${params.toString()}`);
    const data = await res.json();
    setLoadingSlotDetails(false);

    if (!res.ok) {
      setDurationOptions([]);
      setDurationMinutes(null);
      setFloorTables([]);
      return;
    }

    const options = Array.isArray(data.durationOptions)
      ? (data.durationOptions as number[])
      : [slotMinutes];
    setDurationOptions(options);
    setDurationMinutes(options[0] ?? slotMinutes);
    setSelectedTableId(null);
  }, [clubId, date, format, selectedSlot, slotMinutes]);

  const loadFloorTables = useCallback(async () => {
    if (!format || !date || !selectedSlot || !durationMinutes || !hasFloorPlan) {
      setFloorTables([]);
      return;
    }

    setLoadingSlotDetails(true);
    const endsAt = bookingEndsAt(new Date(selectedSlot), durationMinutes).toISOString();
    const params = new URLSearchParams({
      date,
      format,
      startsAt: selectedSlot,
      endsAt,
    });

    const res = await fetch(`/api/clubs/${clubId}/bookings?${params.toString()}`);
    const data = await res.json();
    setLoadingSlotDetails(false);

    if (res.ok && Array.isArray(data.floorTables)) {
      setFloorTables(data.floorTables);
    } else {
      setFloorTables([]);
    }
  }, [clubId, date, durationMinutes, format, hasFloorPlan, selectedSlot]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    if (!selectedSlot) {
      setDurationOptions([]);
      setDurationMinutes(null);
      setFloorTables([]);
      return;
    }
    void loadSlotDetails();
  }, [selectedSlot, loadSlotDetails]);

  useEffect(() => {
    if (!selectedSlot || durationMinutes == null) return;
    void loadFloorTables();
  }, [selectedSlot, durationMinutes, loadFloorTables]);

  const tableStates = useMemo(() => {
    const states: Record<string, "free" | "pending" | "confirmed"> = {};
    for (const table of floorTables) {
      states[table.id] = table.status;
    }
    return states;
  }, [floorTables]);

  const planItemsForBooking = useMemo(() => plan?.items ?? [], [plan]);

  const bookingRangeLabel = useMemo(() => {
    if (!selectedSlot || !endsAtIso) return null;
    const fmt = new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Moscow",
    });
    return `${fmt.format(new Date(selectedSlot))} – ${fmt.format(new Date(endsAtIso))}`;
  }, [selectedSlot, endsAtIso]);

  async function submitBooking() {
    if (!selectedSlot || !format || !endsAtIso) return;
    if (hasFloorPlan && !selectedTableId) {
      setError("Выберите стол на схеме зала");
      return;
    }
    if (!isLoggedIn) {
      router.push(`/login?next=/clubs/${clubId}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/clubs/${clubId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableFormat: format,
        startsAt: selectedSlot,
        endsAt: endsAtIso,
        playerNote: note,
        floorItemId: selectedTableId,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось забронировать");
      return;
    }
    setSuccess("Заявка отправлена — клуб подтвердит бронь");
    setSelectedSlot(null);
    setSelectedTableId(null);
    setDurationMinutes(null);
    setNote("");
    void loadSlots();
    router.refresh();
  }

  if (!bookingEnabled || formats.length === 0) return null;

  return (
    <div className="club-booking">
      <h3 className="site-section-title mb-1">Забронировать стол</h3>
      <p className="home-card-muted mb-4 text-sm">
        Выберите формат, дату, время и длительность
        {hasFloorPlan ? ", затем стол на схеме" : ""} — {clubName} подтвердит бронь.
      </p>

      <div className="club-booking-filters">
        <label className="club-booking-field">
          <span className="club-booking-label">Формат</span>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ClubTableFormatId)}
            className="site-input w-full"
          >
            {formats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} — {formatTableCount(f.count)}
              </option>
            ))}
          </select>
        </label>
        <label className="club-booking-field">
          <span className="club-booking-label">Дата</span>
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="site-input w-full"
          >
            {dates.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <p className="club-booking-label mb-2">Начало</p>
        {loadingSlots ? (
          <p className="text-sm text-zinc-500">Загрузка…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-zinc-500">На эту дату нет свободных слотов.</p>
        ) : (
          <div className="club-booking-slots">
            {slots.map((slot) => (
              <button
                key={slot.startsAt}
                type="button"
                onClick={() => setSelectedSlot(slot.startsAt)}
                className={
                  selectedSlot === slot.startsAt
                    ? "club-booking-slot club-booking-slot--active"
                    : "club-booking-slot"
                }
              >
                <span>{slot.label.split(" – ")[0]}</span>
                <span className="club-booking-slot-meta">
                  {formatTableCount(slot.available, { of: slot.capacity })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedSlot && durationOptions.length > 0 && (
        <div className="mt-4">
          <label className="club-booking-field block">
            <span className="club-booking-label">Длительность</span>
            <select
              value={durationMinutes ?? durationOptions[0]}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="site-input mt-1 w-full max-w-xs"
            >
              {durationOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {formatBookingDuration(minutes)}
                </option>
              ))}
            </select>
          </label>
          {bookingRangeLabel && (
            <p className="mt-2 text-sm text-zinc-400">Интервал: {bookingRangeLabel}</p>
          )}
        </div>
      )}

      {selectedSlot && hasFloorPlan && (
        <div className="mt-4 space-y-2">
          <p className="club-booking-label">Выберите стол</p>
          {loadingSlotDetails ? (
            <p className="text-sm text-zinc-500">Проверка схемы…</p>
          ) : (
            <>
              <ClubFloorPlanCanvas
                items={planItemsForBooking}
                booking
                bookingTableFormat={format}
                selectedId={selectedTableId}
                tableStates={tableStates}
                priceTiers={priceTiers}
                onTableClick={setSelectedTableId}
              />
              <ul className="club-floor-plan-legend">
                <li className="club-floor-plan-legend-item">
                  <span className="club-floor-plan-legend-dot club-floor-plan-legend-dot--free" />
                  <span>Свободен</span>
                </li>
                <li className="club-floor-plan-legend-item">
                  <span className="club-floor-plan-legend-dot club-floor-plan-legend-dot--pending" />
                  <span>Занят (ожидает)</span>
                </li>
                <li className="club-floor-plan-legend-item">
                  <span className="club-floor-plan-legend-dot club-floor-plan-legend-dot--occupied" />
                  <span>Занят</span>
                </li>
              </ul>
              {selectedTableId && (
                <p className="text-sm text-emerald-400">
                  Выбран: {floorTables.find((t) => t.id === selectedTableId)?.label}
                </p>
              )}
              {floorTables.length > 0 && (
                <p className="text-xs text-zinc-500">
                  Свободно {floorTables.filter((t) => t.status === "free").length} из{" "}
                  {floorTables.length} столов на схеме
                </p>
              )}
            </>
          )}
        </div>
      )}

      {selectedSlot && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="club-booking-label">Комментарий (необязательно)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: нужен стол у окна"
              className="site-input mt-1 w-full"
            />
          </label>
          {!isLoggedIn ? (
            <p className="text-sm text-zinc-400">
              <Link href={`/login?next=/clubs/${clubId}`} className="text-emerald-400 hover:underline">
                Войдите
              </Link>
              , чтобы отправить заявку.
            </p>
          ) : (
            <button
              type="button"
              onClick={submitBooking}
              disabled={
                submitting ||
                loadingSlotDetails ||
                !endsAtIso ||
                (hasFloorPlan && !selectedTableId)
              }
              className="site-btn-primary disabled:opacity-50"
            >
              {submitting ? "Отправка…" : "Забронировать"}
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-400">{success}</p>}
    </div>
  );
}

function tableWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "столов";
  if (mod10 === 1) return "стол";
  if (mod10 >= 2 && mod10 <= 4) return "стола";
  return "столов";
}

function formatTableCount(count: number, opts?: { of?: number }): string {
  if (opts?.of != null) {
    return `${count} из ${opts.of} ${tableWord(opts.of)}`;
  }
  return `${count} ${tableWord(count)}`;
}
