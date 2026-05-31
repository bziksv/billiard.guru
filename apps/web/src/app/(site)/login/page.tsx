"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { SiteContainer } from "@/components/site/site-container";
import { PhoneInput } from "@/components/ui/phone-input";
import { t } from "@/lib/site";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/cabinet";

  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        setError(
          data.status === "CANCELLED" ? "Вход отменён" : "Время ожидания истекло",
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [challengeToken, next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!phoneValid) {
      setError("Введите корректный телефон");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
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

      setChallengeToken(data.challengeToken);
    } catch {
      setError("Сервер не ответил. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site-card mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-bold">{t("nav.login")}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Подтверждение через Telegram — бот пришлёт «Подтвердить вход».
      </p>

      {!challengeToken ? (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <PhoneInput
            countryName="Россия"
            value={phone}
            onChange={(e164, valid) => {
              setPhone(e164);
              setPhoneValid(valid);
            }}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !phoneValid}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Отправка…" : "Войти через Telegram"}
          </button>
        </form>
      ) : (
        <div className="mt-6 space-y-3 rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4">
          <p className="text-sm text-emerald-300">
            {polling
              ? "Откройте Telegram и нажмите «Подтвердить вход»…"
              : "Обработка…"}
          </p>
          <p className="text-xs text-zinc-500">
            Сообщение отправлено на привязанный аккаунт.
          </p>
          <button
            type="button"
            onClick={() => {
              setChallengeToken(null);
              setPolling(false);
            }}
            className="text-xs text-zinc-400 underline"
          >
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
