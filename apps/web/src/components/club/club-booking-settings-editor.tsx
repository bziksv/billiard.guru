"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { ClubBookingsManager } from "@/components/club/club-bookings-manager";

export function ClubBookingSettingsEditor({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [bookingSlotMinutes, setBookingSlotMinutes] = useState("60");
  const [bookingAdvanceDays, setBookingAdvanceDays] = useState("14");
  const [gamePrice, setGamePrice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/clubs/${clubId}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Клуб не найден");
      setLoading(false);
      return;
    }
    setBookingEnabled(data.bookingEnabled ?? true);
    setBookingSlotMinutes(String(data.bookingSlotMinutes ?? 60));
    setBookingAdvanceDays(String(data.bookingAdvanceDays ?? 14));
    setGamePrice(data.gamePrice ?? "");
    setLoading(false);
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/clubs/${clubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingEnabled,
        bookingSlotMinutes: Number(bookingSlotMinutes),
        bookingAdvanceDays: Number(bookingAdvanceDays),
        gamePrice: gamePrice || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось сохранить");
      return;
    }
    setBookingEnabled(data.bookingEnabled ?? true);
    setBookingSlotMinutes(String(data.bookingSlotMinutes ?? 60));
    setBookingAdvanceDays(String(data.bookingAdvanceDays ?? 14));
    setGamePrice(data.gamePrice ?? "");
    setMessage("Настройки сохранены");
  }

  if (loading) return <p className="admin-muted text-sm">Загрузка…</p>;

  return (
    <div className="club-booking-settings-editor max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="admin-page-title text-2xl">Брони столов</h1>
          {clubName && <p className="admin-muted mt-1 text-sm">{clubName}</p>}
          <p className="admin-page-lead mt-2 max-w-2xl text-sm">
            Расписание по столам и дням, подтверждение заявок и настройки онлайн-бронирования.
          </p>
        </div>
        <SectionLogsButton section="bookings" clubId={clubId} />
      </div>

      <ClubBookingsManager clubId={clubId} />

      <details className="admin-card group">
        <summary className="cursor-pointer list-none px-6 py-4 font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            Настройки бронирования
            <span className="admin-muted text-xs font-normal group-open:hidden">
              Развернуть
            </span>
          </span>
        </summary>
        <div className="admin-divider space-y-4 border-t px-6 pb-6 pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={bookingEnabled}
              onChange={(e) => setBookingEnabled(e.target.checked)}
            />
            Принимать онлайн-брони
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="admin-label-xs mb-1 block">Длительность слота (мин)</span>
              <input
                value={bookingSlotMinutes}
                onChange={(e) => setBookingSlotMinutes(e.target.value)}
                type="number"
                min={30}
                max={240}
                step={30}
                className="site-input w-full max-w-[120px]"
              />
            </label>
            <label className="block text-sm">
              <span className="admin-label-xs mb-1 block">Бронь на дней вперёд</span>
              <input
                value={bookingAdvanceDays}
                onChange={(e) => setBookingAdvanceDays(e.target.value)}
                type="number"
                min={1}
                max={90}
                className="site-input w-full max-w-[120px]"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Стоимость (текст, если без тарифов)</span>
            <textarea
              value={gamePrice}
              onChange={(e) => setGamePrice(e.target.value)}
              rows={3}
              placeholder={"Почасовая: от 400 ₽/ч\nАбонемент 10 ч — 3500 ₽"}
              className="site-input w-full"
            />
          </label>
          {message && <p className="text-sm text-emerald-400">{message}</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="site-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Сохранение…" : "Сохранить настройки"}
          </button>
        </div>
      </details>
    </div>
  );
}
