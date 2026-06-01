"use client";

import { FormEvent, useState } from "react";
import { ClubTableCountsFields } from "@/components/admin/club-table-counts-fields";
import { CitySelect } from "@/components/admin/city-select";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  parseTableCountsForm,
  type ClubTableCounts,
} from "@/lib/club-table-formats";

export default function NewClubPage() {
  const [cityId, setCityId] = useState("");
  const [countryName, setCountryName] = useState("Россия");
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [tableCounts, setTableCounts] = useState<ClubTableCounts>({});
  const [confirmLink, setConfirmLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!phoneValid) {
      setError("Введите корректный номер телефона");
      return;
    }
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        cityId,
        phone,
        email: form.get("email"),
        address: form.get("address"),
        description: form.get("description"),
        workingHours: form.get("workingHours"),
        tableCounts: parseTableCountsForm(form),
        gamePrice: form.get("gamePrice"),
      }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    setConfirmLink(data.confirmLink);
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Регистрация клуба</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Название клуба" name="name" required />
        <CitySelect
          value={cityId}
          onChange={setCityId}
          onCountryChange={(c) => setCountryName(c?.nameRu ?? "Россия")}
          required
        />
        <PhoneInput
          countryName={countryName}
          value={phone}
          onChange={(e164, valid) => {
            setPhone(e164);
            setPhoneValid(valid);
          }}
          required
        />
        <Field label="Email (необязательно)" name="email" type="email" />
        <Field label="Адрес" name="address" placeholder="Улица, дом, этаж" />
        <ClubTableCountsFields values={tableCounts} onChange={setTableCounts} />
        <TextArea
          label="Режим работы"
          name="workingHours"
          rows={4}
          placeholder={"Пн–Чт 12:00–23:00\nПт 12:00–01:00\nСб–Вс 11:00–01:00"}
        />
        <TextArea
          label="Стоимость игры"
          name="gamePrice"
          rows={3}
          placeholder={"Почасовая: от 400 ₽/ч\nАбонемент 10 ч — 3500 ₽"}
        />
        <TextArea label="Описание клуба" name="description" rows={4} />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !cityId || !phoneValid}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Сохранение..." : "Зарегистрировать"}
        </button>
      </form>
      {confirmLink && (
        <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4">
          <p className="text-sm text-emerald-300">
            Подтвердите регистрацию через Telegram:
          </p>
          <a href={confirmLink} className="mt-2 block break-all text-emerald-400 underline">
            {confirmLink}
          </a>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-400">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  rows = 3,
  placeholder,
}: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-400">{label}</label>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
      />
    </div>
  );
}
