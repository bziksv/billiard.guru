"use client";

import { useEffect, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CLUB_TABLE_FORMATS } from "@/lib/club-table-formats";
import { bookingFormatLabel } from "@/lib/table-booking";
import type { CalendarTable } from "./types";

function ActionButton({
  variant,
  onClick,
  children,
  disabled,
}: {
  variant: "primary" | "danger" | "outline";
  onClick: () => void | Promise<void>;
  children: React.ReactNode;
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
      className={`admin-btn admin-btn--${variant}`}
    >
      {loading ? "…" : children}
    </button>
  );
}

export function ManualBookingModal({
  clubId,
  tables,
  defaultDay,
  slotMinutes,
  onClose,
  onCreated,
}: {
  clubId: string;
  tables: CalendarTable[];
  defaultDay: string;
  slotMinutes: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tableRowId, setTableRowId] = useState(tables[0]?.id ?? "");
  const [date, setDate] = useState(defaultDay);
  const [time, setTime] = useState("14:00");
  const [durationMin, setDurationMin] = useState(String(slotMinutes));
  const [phone, setPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [players, setPlayers] = useState<
    { id: string; firstName: string; lastName: string; phone: string }[]
  >([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const table = tables.find((t) => t.id === tableRowId);

  useEffect(() => {
    if (phone.length < 6) {
      setPlayers([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/clubs/${clubId}/bookings/manage?phone=${encodeURIComponent(phone)}`,
      );
      const data = await res.json();
      setPlayers(Array.isArray(data.players) ? data.players : []);
    }, 300);
    return () => clearTimeout(timer);
  }, [clubId, phone]);

  async function submit() {
    setError(null);
    if (!table) {
      setError("Выберите стол");
      return;
    }
    const startsAt = new Date(`${date}T${time}:00+03:00`);
    const endsAt = new Date(startsAt.getTime() + Number(durationMin) * 60_000);
    if (!playerId && !guestName.trim() && !phone.trim()) {
      setError("Укажите телефон, имя гостя или выберите игрока из базы");
      return;
    }
    const res = await fetch(`/api/clubs/${clubId}/bookings/manage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "CLUB",
        tableFormat: table.tableFormat,
        floorItemId:
          table.id.startsWith("unassigned:") || table.id.startsWith("format:") ? null : table.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        playerId: playerId || null,
        guestName: guestName.trim() || null,
        guestPhone: phone.trim() || null,
        playerNote: note.trim() || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="admin-card fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="admin-card max-h-[90vh] w-full max-w-md overflow-y-auto p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Ручная бронь</h3>
        <p className="admin-muted mt-1 text-sm">Запись гостя администратором, сразу подтверждена.</p>
        <div className="mt-4 space-y-3">
          <SearchableSelect
            label="Стол"
            options={tables.map((t) => ({ value: t.id, label: t.label }))}
            value={tableRowId}
            onChange={setTableRowId}
            placeholder="Стол"
            searchPlaceholder="Поиск…"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="admin-label-xs mb-1 block">Дата</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="admin-input w-full" />
            </label>
            <label className="block text-sm">
              <span className="admin-label-xs mb-1 block">Время</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="admin-input w-full" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Длительность (мин)</span>
            <input
              type="number"
              step={slotMinutes}
              min={slotMinutes}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="admin-input w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Телефон гостя</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="admin-input w-full" placeholder="+7…" />
          </label>
          {players.length > 0 && (
            <SearchableSelect
              label="Игрок в базе"
              options={players.map((p) => ({
                value: p.id,
                label: `${p.lastName} ${p.firstName} · ${p.phone}`,
              }))}
              value={playerId}
              onChange={setPlayerId}
              placeholder="Выберите"
              searchPlaceholder="Поиск…"
            />
          )}
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Имя (если нет в базе)</span>
            <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="admin-input w-full" />
          </label>
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Комментарий гостя</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="admin-input w-full" />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton variant="primary" onClick={submit}>
            Создать
          </ActionButton>
          <ActionButton variant="outline" onClick={onClose}>
            Отмена
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function BlockSlotModal({
  clubId,
  tables,
  defaultDay,
  slotMinutes,
  onClose,
  onCreated,
}: {
  clubId: string;
  tables: CalendarTable[];
  defaultDay: string;
  slotMinutes: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [tableRowId, setTableRowId] = useState(tables[0]?.id ?? "");
  const [date, setDate] = useState(defaultDay);
  const [time, setTime] = useState("14:00");
  const [durationMin, setDurationMin] = useState(String(slotMinutes * 2));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const table = tables.find((t) => t.id === tableRowId);

  async function submit() {
    setError(null);
    if (!table || !reason.trim()) {
      setError("Укажите стол и причину");
      return;
    }
    const startsAt = new Date(`${date}T${time}:00+03:00`);
    const endsAt = new Date(startsAt.getTime() + Number(durationMin) * 60_000);
    const res = await fetch(`/api/clubs/${clubId}/bookings/manage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "BLOCK",
        tableFormat: table.tableFormat,
        floorItemId: table.id.startsWith("unassigned:") || table.id.startsWith("format:")
          ? null
          : table.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        clubNote: reason.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="admin-card max-h-[90vh] w-full max-w-md overflow-y-auto p-5 shadow-xl">
        <h3 className="text-lg font-semibold">Заблокировать стол</h3>
        <p className="admin-muted mt-1 text-sm">Ремонт, турнир, резерв — слот недоступен для брони.</p>
        <div className="mt-4 space-y-3">
          <SearchableSelect
            label="Стол"
            options={tables.map((t) => ({ value: t.id, label: t.label }))}
            value={tableRowId}
            onChange={setTableRowId}
            placeholder="Стол"
            searchPlaceholder="Поиск…"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="admin-label-xs mb-1 block">Дата</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="admin-input w-full" />
            </label>
            <label className="block text-sm">
              <span className="admin-label-xs mb-1 block">С</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="admin-input w-full" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Длительность (мин)</span>
            <input
              type="number"
              step={slotMinutes}
              min={slotMinutes}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="admin-input w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="admin-label-xs mb-1 block">Причина</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="admin-input w-full"
              placeholder="Турнир, ремонт…"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton variant="danger" onClick={submit}>
            Заблокировать
          </ActionButton>
          <ActionButton variant="outline" onClick={onClose}>
            Отмена
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function formatFilterOptions() {
  return [
    { value: "", label: "Все форматы" },
    ...CLUB_TABLE_FORMATS.map((f) => ({ value: f.id, label: f.label })),
  ];
}
