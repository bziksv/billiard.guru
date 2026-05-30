"use client";

import { FormEvent, useState } from "react";
import { CitySelect } from "@/components/admin/city-select";
import { PhoneInput } from "@/components/ui/phone-input";

export default function NewPlayerPage() {
  const [cityId, setCityId] = useState("");
  const [countryName, setCountryName] = useState("Россия");
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
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
    form.set("cityId", cityId);
    form.set("phone", phone);

    const res = await fetch("/api/players", { method: "POST", body: form });
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
      <h1 className="mb-6 text-2xl font-bold">Регистрация игрока</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Фамилия" name="lastName" required />
          <Field label="Имя" name="firstName" required />
          <Field label="Отчество" name="middleName" />
        </div>
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
        <Field
          label="Дата рождения (необязательно)"
          name="birthDate"
          type="date"
        />
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Начальный рейтинг (шаг 0,5)
          </label>
          <input
            name="rating"
            type="number"
            step="0.5"
            min="0"
            defaultValue="0"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Фото</label>
          <input
            name="photo"
            type="file"
            accept="image/*"
            className="w-full text-sm text-zinc-400"
          />
        </div>
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
            Игрок должен подтвердить регистрацию через Telegram (телефон + Telegram):
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
