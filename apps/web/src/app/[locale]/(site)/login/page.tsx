"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { CitySelect } from "@/components/admin/city-select";
import { PersonalDataConsentCheckbox } from "@/components/site/legal/personal-data-consent-checkbox";
import { SiteContainer } from "@/components/site/site-container";
import { PhoneInput } from "@/components/ui/phone-input";
import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";
import { TelegramLink } from "@/lib/contact-links";
import { formatPhoneDisplay } from "@/lib/phone";

type Step = "phone" | "register" | "confirm" | "login" | "telegram_nudge";
type AuthMethod = "telegram" | "call";
type AuthFlow = "login" | "register";

const authPanelClass =
  "rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30";

type CallLoginPayload = {
  challengeToken: string;
  callNumber?: string | null;
  message?: string | null;
  confirmLink?: string | null;
  flow?: AuthFlow;
  callAuthEnabled?: boolean;
};

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
  const [authMethod, setAuthMethod] = useState<AuthMethod>("telegram");
  const [authFlow, setAuthFlow] = useState<AuthFlow>("login");
  const [callNumber, setCallNumber] = useState<string | null>(null);
  const [callAuthEnabled, setCallAuthEnabled] = useState(false);
  const [polling, setPolling] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const finishSession = useCallback(
    (result: { role?: string; needsTelegram?: boolean }) => {
      if (result.needsTelegram) {
        setStep("telegram_nudge");
        setChallengeToken(null);
        setPolling(false);
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
    },
    [next, router],
  );

  const applyCallLogin = useCallback((data: CallLoginPayload) => {
    setStep("login");
    setAuthMethod("call");
    setCallNumber(data.callNumber ?? null);
    setCallAuthEnabled(Boolean(data.callAuthEnabled ?? true));
    setChallengeToken(data.challengeToken);
    setInfo(data.message ?? null);
    if (data.confirmLink) setConfirmLink(data.confirmLink);
    if (data.flow) setAuthFlow(data.flow);
  }, []);

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
        finishSession(result);
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
  }, [challengeToken, finishSession]);

  async function startAuth(e?: FormEvent) {
    e?.preventDefault();
    if (!phoneValid) {
      setError("Введите корректный телефон");
      return;
    }
    if (!consentAccepted) {
      setError("Подтвердите согласие на обработку персональных данных");
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
        setAuthFlow(data.flow === "register" ? "register" : "login");
        if (data.authMethod === "call") {
          applyCallLogin({
            challengeToken: data.challengeToken,
            callNumber: data.callAuth?.callNumber ?? null,
            message: data.message,
            confirmLink: data.confirmLink,
            flow: data.flow,
            callAuthEnabled: data.callAuth?.enabled,
          });
          return;
        }
        setStep("login");
        setAuthMethod("telegram");
        setCallNumber(data.callAuth?.callNumber ?? null);
        setCallAuthEnabled(Boolean(data.callAuth?.enabled));
        setChallengeToken(data.challengeToken);
        setInfo(data.message ?? null);
        if (data.confirmLink) setConfirmLink(data.confirmLink);
        return;
      }

      if (data.mode === "confirm") {
        setStep("confirm");
        setAuthFlow("register");
        setConfirmLink(data.confirmLink);
        setInfo(data.message);
        return;
      }

      setStep("register");
      setAuthFlow("register");
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
    if (!consentAccepted) {
      setError("Подтвердите согласие на обработку персональных данных");
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

      if (data.mode === "login" && data.authMethod === "call") {
        setAuthFlow("register");
        applyCallLogin({
          challengeToken: data.challengeToken,
          callNumber: data.callAuth?.callNumber ?? null,
          message: data.message,
          confirmLink: data.confirmLink,
          flow: "register",
          callAuthEnabled: data.callAuth?.enabled,
        });
        return;
      }

      setStep("confirm");
      setAuthFlow("register");
      setConfirmLink(data.confirmLink);
      setInfo(data.message);
    } catch {
      setError("Сервер не ответил. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  async function switchToCallAuth() {
    if (!phoneValid) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/start-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Не удалось начать вход звонком");
        return;
      }
      applyCallLogin({
        challengeToken: data.challengeToken,
        callNumber: data.callNumber,
        message: data.message,
        flow: authFlow,
      });
    } catch {
      setError("Сервер не ответил. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  function resetToPhone() {
    setStep("phone");
    setChallengeToken(null);
    setAuthMethod("telegram");
    setAuthFlow("login");
    setCallNumber(null);
    setCallAuthEnabled(false);
    setConfirmLink(null);
    setPolling(false);
    setError(null);
    setInfo(null);
  }

  function goToCabinet() {
    router.push(next.startsWith("/admin") ? "/cabinet" : next || "/cabinet");
    router.refresh();
  }

  const botLink = confirmLink ?? `https://t.me/${TELEGRAM_BOT_USERNAME}`;
  const phoneDisplay = phone ? formatPhoneDisplay(phone, countryName) : null;

  return (
    <div className="site-card mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Вход и регистрация</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Введите номер телефона — мы проверим, есть ли вы в базе.
      </p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
        <li>
          <span className="font-medium text-[var(--text-primary)]">Новый пользователь:</span>{" "}
          заполните профиль, подтвердите номер коротким звонком, затем подключите бота{" "}
          <TelegramLink
            username={TELEGRAM_BOT_USERNAME}
            className="font-medium text-emerald-700 underline dark:text-emerald-400"
          />{" "}
          для уведомлений о турнирах, проведения турниров, управления клубом, своей анкеты и
          поиска партнёров для игры.
        </li>
        <li>
          <span className="font-medium text-[var(--text-primary)]">Уже регистрировались:</span>{" "}
          вход через Telegram или тем же коротким звонком.
        </li>
      </ul>

      {step === "phone" && (
        <form onSubmit={startAuth} className="mt-6 space-y-4">
          <PhoneInput
            countryName={countryName}
            value={phone}
            onChange={(e164, valid) => {
              setPhone(e164);
              setPhoneValid(valid);
            }}
            required
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <PersonalDataConsentCheckbox
            checked={consentAccepted}
            onChange={setConsentAccepted}
            id="login-phone-consent"
          />
          <button
            type="submit"
            disabled={loading || !phoneValid || !consentAccepted}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Проверка…" : "Продолжить"}
          </button>
        </form>
      )}

      {step === "register" && (
        <form onSubmit={submitRegister} className="mt-6 space-y-4">
          {info && <p className="text-sm text-emerald-800 dark:text-emerald-300/90">{info}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--text-secondary)]">Фамилия</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="site-input w-full"
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--text-secondary)]">Имя</span>
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
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <PersonalDataConsentCheckbox
            checked={consentAccepted}
            onChange={setConsentAccepted}
            id="login-register-consent"
          />
          <button
            type="submit"
            disabled={loading || !consentAccepted}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Регистрация…" : "Зарегистрироваться"}
          </button>
          <button type="button" onClick={resetToPhone} className="text-xs text-[var(--text-muted)] underline hover:text-[var(--text-primary)]">
            Другой номер
          </button>
        </form>
      )}

      {step === "confirm" && (
        <div className={`mt-6 ${authPanelClass} space-y-4`}>
          {info && <p className="text-sm text-emerald-800 dark:text-emerald-300">{info}</p>}
          <ol className="list-decimal space-y-2 pl-4 text-sm text-zinc-600 dark:text-zinc-300">
            <li>
              Откройте{" "}
              <a
                href={botLink}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                бота в Telegram
              </a>
            </li>
            <li>Нажмите «Поделиться контактом» или Start по ссылке</li>
            <li>Вернитесь сюда и нажмите «Войти»</li>
          </ol>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void startAuth()}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Проверка…" : "Войти после подтверждения"}
          </button>
          <button
            type="button"
            onClick={resetToPhone}
            className="pt-1 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
          >
            Другой номер
          </button>
        </div>
      )}

      {step === "login" && authMethod === "call" && (
        <div className={`mt-6 ${authPanelClass} space-y-3`}>
          {info && <p className="text-sm text-emerald-800 dark:text-emerald-300">{info}</p>}
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {polling
              ? "Ждём ваш звонок…"
              : authFlow === "register"
                ? "Подтвердите номер коротким звонком"
                : "Позвоните на номер ниже для входа"}
          </p>
          {callNumber ? (
            <>
              {phoneDisplay && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Звоните <span className="font-medium text-[var(--text-primary)]">с номера {phoneDisplay}</span>{" "}
                  — он должен совпасть с тем, что вы вводили.
                </p>
              )}
              <p className="text-xs text-[var(--text-muted)]">Наберите короткий номер:</p>
              <p className="text-center text-2xl font-bold tracking-wide text-[var(--text-primary)] tabular-nums">
                <a href={`tel:+${callNumber.replace(/\D/g, "")}`} className="hover:underline">
                  {callNumber}
                </a>
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Номер для звонка пока не активирован. Используйте Telegram.
            </p>
          )}
          <ol className="list-decimal space-y-1 pl-4 text-xs text-zinc-600 dark:text-zinc-300">
            <li>Дождитесь сброса — разговаривать не нужно</li>
            <li>
              {authFlow === "register"
                ? "После звонка предложим подключить Telegram для уведомлений"
                : "Страница войдёт автоматически"}
            </li>
          </ol>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            onClick={resetToPhone}
            className="pt-1 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
          >
            Отменить
          </button>
        </div>
      )}

      {step === "login" && authMethod === "telegram" && (
        <div className={`mt-6 ${authPanelClass} space-y-3`}>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {polling
              ? "Откройте Telegram и нажмите «Подтвердить вход»…"
              : "Обработка…"}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Сообщение отправлено на привязанный аккаунт.
          </p>
          {callAuthEnabled && callNumber && (
            <div className="border-t border-emerald-200/80 pt-3 dark:border-emerald-900/50">
              <p className="text-xs text-[var(--text-muted)]">
                Или позвоните с телефона, который вводили — звонок сбросится сам:
              </p>
              <p className="mt-1 text-center text-lg font-bold tabular-nums text-[var(--text-primary)]">
                <a href={`tel:+${callNumber.replace(/\D/g, "")}`} className="hover:underline">
                  {callNumber}
                </a>
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void switchToCallAuth()}
                className="mt-2 w-full text-center text-xs text-emerald-800 underline hover:text-emerald-950 disabled:opacity-50 dark:text-emerald-300"
              >
                Обновить ожидание звонка
              </button>
            </div>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            onClick={resetToPhone}
            className="pt-1 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
          >
            Отменить
          </button>
        </div>
      )}

      {step === "telegram_nudge" && (
        <div className={`mt-6 ${authPanelClass} space-y-4`}>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {authFlow === "register" ? "Регистрация завершена!" : "Вход выполнен!"}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Подключите бота{" "}
            <TelegramLink
              username={TELEGRAM_BOT_USERNAME}
              className="font-medium text-emerald-700 underline dark:text-emerald-400"
            />{" "}
            — так вы будете получать уведомления о турнирах, проводить турниры, управлять клубом,
            анкетой и искать партнёров для игры на billiard.guru.
          </p>
          <ol className="list-decimal space-y-2 pl-4 text-sm text-zinc-600 dark:text-zinc-300">
            <li>
              Откройте{" "}
              <a
                href={botLink}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                бота в Telegram
              </a>
            </li>
            <li>Нажмите Start или «Поделиться контактом»</li>
            <li>Можно сделать это позже — вход уже активен</li>
          </ol>
          <a
            href={botLink}
            target="_blank"
            rel="noreferrer"
            className="site-btn-primary block w-full text-center"
          >
            Открыть бота
          </a>
          <button type="button" onClick={goToCabinet} className="site-btn-secondary w-full">
            Позже — в кабинет
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        <Link href="/" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          На главную
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SiteContainer className="flex flex-1 flex-col items-center justify-center py-16">
      <Suspense fallback={<div className="text-[var(--text-muted)]">Загрузка…</div>}>
        <LoginForm />
      </Suspense>
    </SiteContainer>
  );
}
