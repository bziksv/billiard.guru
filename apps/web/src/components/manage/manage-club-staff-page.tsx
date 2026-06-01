"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { PhoneInput } from "@/components/ui/phone-input";

type StaffPlayer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  telegramUsername: string | null;
  isVerified: boolean;
};

type StaffRow = {
  id: string;
  playerId: string;
  createdAt: string;
  player: StaffPlayer;
};

export function ManageClubStaffPage({
  clubId,
  clubName,
}: {
  clubId: string;
  clubName: string;
}) {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [countryName, setCountryName] = useState("Россия");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const clubRes = await fetch(`/api/clubs/${clubId}`);
    if (clubRes.ok) {
      const clubData = await clubRes.json();
      setCountryName(clubData.city?.country?.nameRu ?? "Россия");
    }
    const res = await fetch(`/api/clubs/${clubId}/staff`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось загрузить список");
      return;
    }
    setStaff(Array.isArray(data.staff) ? data.staff : []);
    setIsOwner(Boolean(data.isOwner));
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addStaff() {
    if (!phoneValid || !phone.trim()) {
      setError("Укажите корректный телефон");
      return;
    }
    setAdding(true);
    setError(null);
    const res = await fetch(`/api/clubs/${clubId}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось добавить");
      return;
    }
    setPhone("");
    setPhoneValid(false);
    await load();
  }

  async function removeStaff(staffId: string) {
    if (!confirm("Убрать доступ сотрудника к управлению клубом?")) return;
    setBusyId(staffId);
    setError(null);
    const res = await fetch(`/api/clubs/${clubId}/staff/${staffId}`, { method: "DELETE" });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Не удалось удалить");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Сотрудники клуба</h1>
          <p className="admin-muted mt-1 text-sm">
            {clubName} — сотрудники видят разделы управления так же, как владелец: брони, турниры,
            игроки, новости и т.д.
          </p>
        </div>
        <SectionLogsButton section="staff" clubId={clubId} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="admin-muted text-sm">Загрузка…</p>
      ) : (
        <>
          {!isOwner && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              Вы вошли как сотрудник. Список ниже доступен только для просмотра; добавлять и
              удалять сотрудников может владелец клуба.
            </p>
          )}

          {isOwner && (
            <section className="admin-card max-w-lg space-y-3 p-4">
              <h2 className="text-lg font-semibold">Добавить сотрудника</h2>
              <p className="admin-muted text-sm">
                Игрок должен быть зарегистрирован на сайте с этим номером телефона.
              </p>
              <label className="admin-label-xs mb-1 block">Телефон</label>
              <PhoneInput
                countryName={countryName}
                value={phone}
                onChange={(e164, valid) => {
                  setPhone(e164);
                  setPhoneValid(valid);
                }}
              />
              <button
                type="button"
                disabled={adding || !phoneValid}
                onClick={() => void addStaff()}
                className="admin-btn admin-btn--primary"
              >
                {adding ? "Добавление…" : "Добавить"}
              </button>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              Список
              {staff.length > 0 && (
                <span className="admin-muted ml-2 text-base font-normal">({staff.length})</span>
              )}
            </h2>
            {staff.length === 0 ? (
              <p className="admin-muted text-sm">Пока нет назначенных сотрудников.</p>
            ) : (
              <div className="admin-table-wrap overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="admin-thead">
                    <tr>
                      <th className="px-3 py-2 text-left">Имя</th>
                      <th className="px-3 py-2 text-left">Телефон</th>
                      <th className="px-3 py-2 text-left">Telegram</th>
                      <th className="px-3 py-2 text-left">Статус</th>
                      {isOwner && <th className="px-3 py-2 text-right">Действия</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((row) => (
                      <tr key={row.id} className="admin-table-row">
                        <td className="px-3 py-2 font-medium">
                          {row.player.lastName} {row.player.firstName}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{row.player.phone}</td>
                        <td className="admin-muted px-3 py-2">
                          {row.player.telegramUsername
                            ? `@${row.player.telegramUsername}`
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {row.player.isVerified ? (
                            <span className="text-emerald-600">Подтверждён</span>
                          ) : (
                            <span className="admin-muted">Не подтверждён</span>
                          )}
                        </td>
                        {isOwner && (
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              disabled={busyId === row.id}
                              onClick={() => void removeStaff(row.id)}
                              className="admin-btn admin-btn--danger"
                            >
                              Убрать
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
