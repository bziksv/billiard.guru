"use client";

import { FormEvent, useState } from "react";
import { CitySelect } from "@/components/admin/city-select";
import { PhoneInput } from "@/components/ui/phone-input";

export function ManagePlayerRegisterForm({
  clubId,
  onRegistered,
}: {
  clubId: string;
  onRegistered?: () => void;
}) {
  const [cityId, setCityId] = useState("");
  const [countryName, setCountryName] = useState("Россия");
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [confirmLink, setConfirmLink] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
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
    setSuccessMessage(null);
    setConfirmLink(null);
    const form = new FormData(e.currentTarget);
    form.set("cityId", cityId);
    form.set("phone", phone);

    const res = await fetch(`/api/clubs/${clubId}/players/register`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    setConfirmLink(data.confirmLink);
    setSuccessMessage(
      data.message ??
        "Игрок зарегистрирован и добавлен в список игроков клуба.",
    );
    onRegistered?.();
    e.currentTarget.reset();
    setCityId("");
    setPhone("");
    setPhoneValid(false);
  }

  return (
    <div>
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
        <Field label="Дата рождения (необязательно)" name="birthDate" type="date" />
        <div>
          <label className="mb-1 block text-sm text-zinc-400">
            Начальный рейтинг (шаг 0,5) — общий и в клубе
          </label>
          <input
            name="rating"
            type="number"
            step="0.5"
            min="0"
            defaultValue="0"
            className="site-input w-full max-w-[140px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Фото</label>
          <input name="photo" type="file" accept="image/*" className="w-full text-sm text-zinc-400" />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !cityId || !phoneValid}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "Сохранение…" : "Зарегистрировать"}
        </button>
      </form>
      {successMessage && (
        <div className="mt-6 rounded-lg border border-emerald-800/50 bg-emerald-950/30 p-4 space-y-2">
          <p className="text-sm text-emerald-300">{successMessage}</p>
          {confirmLink && (
            <>
              <p className="text-sm text-zinc-400">
                Подтверждение в Telegram:
              </p>
              <a
                href={confirmLink}
                className="block break-all text-sm text-emerald-400 underline"
              >
                {confirmLink}
              </a>
            </>
          )}
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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-zinc-400">{label}</label>
      <input name={name} type={type} required={required} className="site-input w-full" />
    </div>
  );
}
