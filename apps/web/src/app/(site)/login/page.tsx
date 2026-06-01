"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { CitySelect } from "@/components/admin/city-select";
import { SiteContainer } from "@/components/site/site-container";
import { PhoneInput } from "@/components/ui/phone-input";
import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";

type Step = "phone" | "register" | "confirm" | "login";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/cabinet";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [cityId, setCityId] = useState("");
  const [countryName, setCountryName] = useState("Россия");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [confirmLink, setConfirmLink] = useState<string | null>(null);
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!challengeToken) return;

    setPolling(true);
    const interval = setInterval(async () => {
      const res = await fetch(`/api/auth/challenge/${challengeToken}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.status === "CONFIRMED") {
        clearInterval(interval);
        const complete = await fetch("/api/auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ challengeToken }),
        });
        const result = await complete.json();
        setPolling(false);
        if (!complete.ok) {
          setError(result.error ?? "Ошибка входа");
          setChallengeToken(null);
          setStep("phone");
          return;
        }
        router.push(
          result.role === "SUPERADMIN" && next.startsWith("/admin")
            ? next
            : next.startsWith("/admin")
              ? "/cabinet"
              : next || "/cabinet",
        );
        router.refresh();
      }

      if (data.status === "CANCELLED" || data.status === "EXPIRED") {
        clearInterval(interval);
        setPolling(false);
        setChallengeToken(null);
        setStep("phone");
        setError(
          data.status === "CANCELLED" ? "Вход отменён" : "Время ожидания истекло",
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [challengeToken, next, router]);

  async function startAuth(e?: FormEvent) {
    e?.preventDefault();
    if (!phoneValid) {
      setError("Введите корректный телефон");
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Ошибка");
        return;
      }

      if (data.mode === "login") {
        setStep("login");
        setChallengeToken(data.challengeToken);
        return;
      }

      if (data.mode === "confirm") {
        setStep("confirm");
        setConfirmLink(data.confirmLink);
        setInfo(data.message);
        return;
      }

      setStep("register");
      setInfo(data.message);
    } catch {
      setError("Сервер не ответил. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(e: FormEvent) {
    e.preventDefault();
    if (!phoneValid || !cityId || firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError("Заполните фамилию, имя, город и телефон");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          cityId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка регистрации");
        return;
      }
      setStep("confirm");
      setConfirmLink(data.confirmLink);
      setInfo(data.message);
    } catch {
      setError("Сервер не ответил. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  function resetToPhone() {
    setStep("phone");
    setChallengeToken(null);
    setConfirmLink(null);
    setPolling(false);
    setError(null);
    setInfo(null);
  }

  return (
    <div className="site-card mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">Вход и регистрация</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Один номер телефона: если вы уже в базе — вход через Telegram; если нет — короткая
        регистрация и подтверждение в боте @{TELEGRAM_BOT_USERNAME}.
      </p>

      {step === "phone" && (
        <form onSubmit={startAuth} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Телефон</span>
            <PhoneInput
              countryName={countryName}
              value={phone}
              onChange={(e164, valid) => {
                setPhone(e164);
                setPhoneValid(valid);
              }}
              required
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !phoneValid}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Проверка…" : "Продолжить"}
          </button>
        </form>
      )}

      {step === "register" && (
        <form onSubmit={submitRegister} className="mt-6 space-y-4">
          {info && <p className="text-sm text-emerald-300/90">{info}</p>}
          <p className="text-xs text-zinc-500 tabular-nums">{phone}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">Фамилия</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="site-input w-full"
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-400">Имя</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="site-input w-full"
                required
                minLength={2}
              />
            </label>
          </div>
          <CitySelect
            value={cityId}
            onChange={setCityId}
            onCountryChange={(c) => setCountryName(c?.nameRu ?? "Россия")}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Регистрация…" : "Зарегистрироваться"}
          </button>
          <button type="button" onClick={resetToPhone} className="text-xs text-zinc-400 underline">
            Другой номер
          </button>
        </form>
      )}

      {step === "confirm" && (
        <div className="mt-6 space-y-4 rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4">
          {info && <p className="text-sm text-emerald-300">{info}</p>}
          <ol className="list-decimal space-y-2 pl-4 text-sm text-zinc-300">
            <li>
              Откройте{" "}
              <a
                href={confirmLink ?? `https://t.me/${TELEGRAM_BOT_USERNAME}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 underline"
              >
                бота в Telegram
              </a>
            </li>
            <li>Нажмите «Поделиться контактом» или Start по ссылке</li>
            <li>Вернитесь сюда и нажмите «Войти»</li>
          </ol>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void startAuth()}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Проверка…" : "Войти после подтверждения"}
          </button>
          <button type="button" onClick={resetToPhone} className="text-xs text-zinc-400 underline">
            Другой номер
          </button>
        </div>
      )}

      {step === "login" && (
        <div className="mt-6 space-y-3 rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4">
          <p className="text-sm text-emerald-300">
            {polling
              ? "Откройте Telegram и нажмите «Подтвердить вход»…"
              : "Обработка…"}
          </p>
          <p className="text-xs text-zinc-500">
            Сообщение отправлено на привязанный аккаунт.
          </p>
          <button type="button" onClick={resetToPhone} className="text-xs text-zinc-400 underline">
            Отменить
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-zinc-500">
        <Link href="/" className="text-emerald-400 hover:underline">
          На главную
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SiteContainer className="flex flex-1 flex-col items-center justify-center py-16">
      <Suspense fallback={<div className="text-zinc-500">Загрузка…</div>}>
        <LoginForm />
      </Suspense>
    </SiteContainer>
  );
}
