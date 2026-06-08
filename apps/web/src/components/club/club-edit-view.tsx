"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ConfirmModal } from "@/components/bracket/confirm-modal";
import { ClubPhotosEditor } from "@/components/club/club-photos-editor";
import { clubEditablePhotoUrls } from "@/lib/club-photos";
import { ClubConfirmPanel } from "@/components/admin/club-confirm-panel";
import { SectionLogsButton } from "@/components/audit/section-logs-button";
import { ClubBookingsPanel } from "@/components/admin/club-bookings-panel";
import { ClubTableCountsFields } from "@/components/admin/club-table-counts-fields";
import {
  ClubPriceTiersFields,
  ClubWeeklyHoursFields,
  DEMO_PRICE_TIERS,
} from "@/components/admin/club-schedule-fields";
import { CitySelect } from "@/components/admin/city-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { CLUB_TABLE_FORMATS, parseClubTableCounts, type ClubTableCounts } from "@/lib/club-table-formats";
import {
  hoursFootnote,
  parsePriceTiers,
  parseWeeklyHours,
  priceTiersToJson,
  resolveWeeklyHours,
  weeklyHoursToJson,
  type PriceTier,
  type WeeklyHoursSlot,
} from "@/lib/club-schedule";

interface Club {
  id: string;
  name: string;
  cityId: string;
  phone: string;
  displayPhone: string | null;
  email: string | null;
  photoUrl: string | null;
  galleryUrls: unknown;
  description: string | null;
  address: string | null;
  workingHours: string | null;
  weeklyHours: unknown;
  tableCount: number | null;
  tableCounts: unknown;
  gamePrice: string | null;
  priceTiers: unknown;
  bookingEnabled: boolean;
  bookingSlotMinutes: number;
  bookingAdvanceDays: number;
  city: { nameRu: string; country: { nameRu: string } };
  _count?: { tournaments: number };
}

export function ClubEditView({
  clubId,
  variant,
}: {
  clubId: string;
  variant: "admin" | "manage";
}) {
  const router = useRouter();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHoursSlot[]>([]);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [tableCounts, setTableCounts] = useState<ClubTableCounts>({});
  const [gamePrice, setGamePrice] = useState("");
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [bookingSlotMinutes, setBookingSlotMinutes] = useState("60");
  const [bookingAdvanceDays, setBookingAdvanceDays] = useState("14");
  const [displayPhone, setDisplayPhone] = useState("");
  const [displayPhoneValid, setDisplayPhoneValid] = useState(true);
  const [countryName, setCountryName] = useState("Россия");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removingPhotoUrl, setRemovingPhotoUrl] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    const clubRes = await fetch(`/api/clubs/${id}`);
    const clubData = await clubRes.json();
    if (!clubRes.ok) {
      setError(clubData.error ?? "Клуб не найден");
      setLoading(false);
      return;
    }
    setClub(clubData);
    setName(clubData.name);
    setCityId(clubData.cityId);
    setEmail(clubData.email ?? "");
    setDescription(clubData.description ?? "");
    setAddress(clubData.address ?? "");
    const slots = resolveWeeklyHours(clubData.weeklyHours, clubData.workingHours);
    if (variant === "admin") {
      const tiers = parsePriceTiers(clubData.priceTiers);
      setPriceTiers(tiers.length > 0 ? tiers : DEMO_PRICE_TIERS);
    }
    setWorkingHours(hoursFootnote(clubData.workingHours) ?? "");
    setWeeklyHours(
      slots.length > 0
        ? slots
        : [{ days: ["mon", "tue", "wed", "thu", "fri"], open: "12:00", close: "23:00" }],
    );
    setTableCounts(parseClubTableCounts(clubData.tableCounts));
    if (variant === "admin") {
      setGamePrice(clubData.gamePrice ?? "");
      setBookingEnabled(clubData.bookingEnabled ?? true);
      setBookingSlotMinutes(String(clubData.bookingSlotMinutes ?? 60));
      setBookingAdvanceDays(String(clubData.bookingAdvanceDays ?? 14));
    }
    setDisplayPhone(clubData.displayPhone ?? "");
    setDisplayPhoneValid(true);
    setCountryName(clubData.city?.country?.nameRu ?? "Россия");
    setPhotoUrls(clubEditablePhotoUrls(clubData));
    setPhoto(null);
    setPhotoPreview(null);
    setLoading(false);
  }, [variant]);

  useEffect(() => {
    load(clubId);
  }, [clubId, load]);

  async function saveClub(e?: FormEvent) {
    e?.preventDefault();
    if (displayPhone && !displayPhoneValid) {
      setError("Введите корректный телефон клуба");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);

    const form = new FormData();
    form.set("name", name);
    form.set("cityId", cityId);
    form.set("email", email);
    form.set("description", description);
    form.set("address", address);
    form.set("workingHours", workingHours);
    form.set("weeklyHours", JSON.stringify(weeklyHoursToJson(weeklyHours)));
    if (variant === "admin") {
      form.set("priceTiers", JSON.stringify(priceTiersToJson(priceTiers)));
      form.set("gamePrice", gamePrice);
      form.set("bookingEnabled", bookingEnabled ? "1" : "0");
      form.set("bookingSlotMinutes", bookingSlotMinutes);
      form.set("bookingAdvanceDays", bookingAdvanceDays);
    }
    form.set("displayPhone", displayPhone);
    for (const format of CLUB_TABLE_FORMATS) {
      const count = tableCounts[format.id];
      if (count != null && count > 0) {
        form.set(`tableCount_${format.id}`, String(count));
      }
    }
    form.set("galleryUrls", JSON.stringify(photoUrls));
    if (photo) form.set("photo", photo);

    const res = await fetch(`/api/clubs/${clubId}`, { method: "PATCH", body: form });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка сохранения");
      return;
    }
    setClub(data);
    setPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    setPhotoUrls(clubEditablePhotoUrls(data));
    setMessage("Сохранено");
  }

  function pickPhoto(file: File) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function removePhoto(url: string) {
    setRemovingPhotoUrl(url);
    setError(null);
    const next = photoUrls.filter((u) => u !== url);
    const res = await fetch(`/api/clubs/${clubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ galleryUrls: next }),
    });
    const data = await res.json();
    setRemovingPhotoUrl(null);
    if (!res.ok) {
      setError(data.error ?? "Не удалось удалить фото");
      return;
    }
    setClub(data);
    setPhotoUrls(clubEditablePhotoUrls(data));
    setMessage("Фото удалено");
  }

  async function deleteClub() {
    if (!club) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const res = await fetch(`/api/clubs/${clubId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName: club.name }),
    });
    const data = await res.json();
    setDeleteLoading(false);
    if (!res.ok) {
      setDeleteError(data.error ?? "Не удалось удалить клуб");
      return;
    }
    router.push("/admin/clubs");
    router.refresh();
  }

  if (loading) return <p className="text-sm text-zinc-500">Загрузка…</p>;
  if (!club) return <p className="text-sm text-red-400">{error ?? "Клуб не найден"}</p>;

  return (
    <div className="club-edit-view">
      {variant === "admin" && (
        <Link href="/admin/clubs" className="text-sm text-emerald-400 hover:underline">
          ← Клубы
        </Link>
      )}

      <div
        className={
          variant === "admin"
            ? "mt-4 flex flex-wrap items-center justify-between gap-3"
            : "flex flex-wrap items-center justify-between gap-3"
        }
      >
        <h1 className="text-2xl font-bold">{club.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={
              variant === "admin"
                ? `/admin/clubs/${club.id}/news`
                : `/manage/clubs/${club.id}/news`
            }
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-600"
          >
            Новости клуба
          </Link>
          <SectionLogsButton
            section="club"
            clubId={club.id}
            context={variant === "admin" ? "admin" : "manage"}
          />
          <Link
            href={`/clubs/${club.id}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-600"
          >
            На сайте
          </Link>
          {variant === "admin" && (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              className="admin-btn admin-btn--danger px-4 py-2 text-sm"
            >
              Удалить клуб
            </button>
          )}
        </div>
      </div>

      {variant === "admin" && (
        <ConfirmModal
          open={deleteOpen}
          title="Удалить клуб?"
          description={
            club._count && club._count.tournaments > 0
              ? `Клуб «${club.name}» и ${club._count.tournaments} турнир(ов) будут удалены безвозвратно. Также исчезнут новости, брони, рейтинги и сотрудники этого клуба.`
              : `Клуб «${club.name}» будет удалён безвозвратно вместе с новостями, бронями, рейтингами и сотрудниками.`
          }
          confirmLabel="Удалить навсегда"
          variant="danger"
          loading={deleteLoading}
          error={deleteError}
          confirmPhrase={club.name}
          confirmPhraseLabel={`Введите название клуба «${club.name}» для подтверждения`}
          onConfirm={deleteClub}
          onClose={() => {
            if (deleteLoading) return;
            setDeleteOpen(false);
            setDeleteError(null);
          }}
        />
      )}

      <div className="flex items-start gap-6 lg:gap-10">
        <div className="min-w-0 max-w-2xl flex-1 space-y-8">
          <ClubConfirmPanel clubId={clubId} variant={variant} />

          <form
            id="club-edit-form"
            onSubmit={saveClub}
            className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6"
          >
        <h2 className="font-semibold">Профиль клуба</h2>

        <ClubPhotosEditor
          photoUrls={photoUrls}
          pendingPreview={photoPreview}
          onPickFile={pickPhoto}
          onRemove={removePhoto}
          removingUrl={removingPhotoUrl}
          disabled={saving}
        />

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Название</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="site-input w-full" required />
        </label>

        <CitySelect
          value={cityId}
          onChange={setCityId}
          onCountryChange={(c) => setCountryName(c?.nameRu ?? "Россия")}
        />

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
          <div>
            <p className="text-sm font-medium">Телефоны</p>
            <p className="mt-1 text-xs text-zinc-500">
              Мобильный владельца используется для Telegram и определения владельца клуба.
              На сайте показывается отдельный телефон клуба.
            </p>
          </div>
          <div className="text-sm">
            <span className="text-zinc-400">Телефон владельца (привязка): </span>
            <span className="font-mono text-zinc-200">{club.phone}</span>
          </div>
          <div className="text-sm">
            <span className="mb-1 block text-zinc-400">Телефон клуба для сайта</span>
            <PhoneInput
              countryName={countryName}
              value={displayPhone}
              onChange={(e164, valid) => {
                setDisplayPhone(e164);
                setDisplayPhoneValid(valid || e164 === "");
              }}
            />
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Адрес</span>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="site-input w-full"
            placeholder="Улица, дом — координаты для карты определятся автоматически"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Укажите улицу и номер дома, например: ул. Московский проспект, 129. После сохранения
            клуб появится на карте на сайте.
          </p>
        </label>

        <ClubWeeklyHoursFields slots={weeklyHours} onChange={setWeeklyHours} />

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="site-input w-full" type="email" />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="site-input w-full"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Примечание к графику</span>
          <textarea
            value={workingHours}
            onChange={(e) => setWorkingHours(e.target.value)}
            rows={2}
            placeholder="Последний заход за стол — за 30 минут до закрытия."
            className="site-input w-full"
          />
        </label>

        <ClubTableCountsFields values={tableCounts} onChange={setTableCounts} />

        {variant === "admin" && (
          <ClubPriceTiersFields tiers={priceTiers} onChange={setPriceTiers} />
        )}

        {variant === "admin" && (
          <>
            <div className="rounded-lg border border-zinc-800 p-4 space-y-3">
              <h3 className="font-medium">Бронирование столов</h3>
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
                  <span className="mb-1 block text-zinc-400">Длительность слота (мин)</span>
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
                  <span className="mb-1 block text-zinc-400">Бронь на дней вперёд</span>
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
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">Стоимость (текст, если без тарифов)</span>
              <textarea
                value={gamePrice}
                onChange={(e) => setGamePrice(e.target.value)}
                rows={3}
                placeholder={"Почасовая: от 400 ₽/ч\nАбонемент 10 ч — 3500 ₽"}
                className="site-input w-full"
              />
            </label>
          </>
        )}
          </form>

          {variant === "admin" && (
            <section className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="font-semibold">Брони столов</h2>
              <ClubBookingsPanel clubId={clubId} />
            </section>
          )}
        </div>

        <aside
          className="sticky top-6 hidden w-40 shrink-0 self-start md:block"
          aria-live="polite"
        >
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl shadow-black/30">
            {message && (
              <p className="mb-3 text-center text-sm font-medium text-emerald-400">{message}</p>
            )}
            {error && !message && (
              <p className="mb-3 text-center text-sm font-medium text-red-400">{error}</p>
            )}
            <button
              type="submit"
              form="club-edit-form"
              disabled={saving}
              className="admin-btn admin-btn--primary w-full py-3 text-sm"
            >
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-4 right-4 z-50 md:hidden" aria-live="polite">
        <div className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/95 py-2 pl-4 pr-2 shadow-xl shadow-black/40 backdrop-blur-sm">
          {message && <span className="text-xs font-medium text-emerald-400">{message}</span>}
          {error && !message && <span className="text-xs font-medium text-red-400">{error}</span>}
          <button
            type="submit"
            form="club-edit-form"
            disabled={saving}
            className="admin-btn admin-btn--primary rounded-full px-5 py-2.5 text-sm"
          >
            {saving ? "…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
