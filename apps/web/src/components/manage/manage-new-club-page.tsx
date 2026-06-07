"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { CitySelect } from "@/components/admin/city-select";
import { PhoneInput } from "@/components/ui/phone-input";

type ManageNewClubPageProps = {
  ownerPhone: string;
};

export function ManageNewClubPage({ ownerPhone }: ManageNewClubPageProps) {
  const router = useRouter();
  const [cityId, setCityId] = useState("");
  const [countryName, setCountryName] = useState("Россия");
  const [displayPhone, setDisplayPhone] = useState("");
  const [displayPhoneValid, setDisplayPhoneValid] = useState(true);
  const [confirmLink, setConfirmLink] = useState<string | null>(null);
  const [telegramSent, setTelegramSent] = useState<boolean | null>(null);
  const [telegramSentReason, setTelegramSentReason] = useState<string | null>(null);
  const [createdClubId, setCreatedClubId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cityId) {
      setError("Выберите город");
      return;
    }
    if (displayPhone && !displayPhoneValid) {
      setError("Введите корректный номер для сайта");
      return;
    }
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/manage/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        cityId,
        address: form.get("address"),
        displayPhone: displayPhone || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    setConfirmLink(data.confirmLink ?? null);
    setTelegramSent(data.telegramSent ?? null);
    setTelegramSentReason(data.telegramSentReason ?? null);
    setCreatedClubId(data.id ?? null);
  }

  if (confirmLink) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Клуб создан</h1>
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-4">
          <p className="text-sm text-emerald-300">
            {telegramSent
              ? "Подтверждение отправлено в Telegram. Если сообщения нет — откройте ссылку ниже."
              : "Подтвердите новый клуб через Telegram — откройте ссылку в боте с того же аккаунта, что привязан к вашему профилю."}
            {!telegramSent && telegramSentReason ? (
              <span className="mt-1 block text-amber-300/90">
                Автоотправка не удалась: {telegramSentReason}
              </span>
            ) : null}
          </p>
          <a
            href={confirmLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block break-all text-sm text-emerald-400 underline"
          >
            {confirmLink}
          </a>
        </div>
        <p className="text-sm text-zinc-400">
          После подтверждения клуб появится в переключателе слева. Пока он не подтверждён,
          турниры и публичные функции будут недоступны.
        </p>
        {createdClubId && (
          <Link
            href={`/manage/clubs/${createdClubId}`}
            className="site-btn-primary inline-block"
            onClick={() => router.refresh()}
          >
            Перейти к клубу
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-2xl font-bold">Добавить клуб</h1>
      <p className="home-card-muted mb-6 text-sm">
        Новый клуб будет привязан к вашему аккаунту. Номер владельца подставляется из профиля —
        через него вы подтверждаете клуб в Telegram.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Название клуба" name="name" required />
        <CitySelect
          value={cityId}
          onChange={setCityId}
          onCountryChange={(c) => setCountryName(c?.nameRu ?? "Россия")}
          required
        />
        <Field label="Адрес" name="address" placeholder="Улица, дом, этаж" />
        <div>
          <label className="club-booking-label mb-1 block text-sm">
            Телефон на сайте (необязательно)
          </label>
          <p className="home-card-muted mb-2 text-xs">
            Публичный номер для карточки клуба. Если не указать — на сайте телефон не показывается.
          </p>
          <PhoneInput
            countryName={countryName}
            value={displayPhone}
            onChange={(e164, valid) => {
              setDisplayPhone(e164);
              setDisplayPhoneValid(valid || e164 === "");
            }}
          />
        </div>
        <div>
          <label className="club-booking-label mb-1 block text-sm">Телефон владельца</label>
          <p className="font-mono text-sm text-zinc-300">{ownerPhone}</p>
          <p className="home-card-muted mt-1 text-xs">
            Используется для доступа в /manage и подтверждения в Telegram.
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || !cityId}
            className="site-btn-primary disabled:opacity-50"
          >
            {loading ? "Создание…" : "Создать клуб"}
          </button>
          <Link href="/manage" className="site-btn-ghost">
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="club-booking-label">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="site-input mt-1 w-full"
      />
    </label>
  );
}
