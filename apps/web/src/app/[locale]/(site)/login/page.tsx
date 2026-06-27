"use client";

import { Link } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CitySelect } from "@/components/admin/city-select";
import { PersonalDataConsentCheckbox } from "@/components/site/legal/personal-data-consent-checkbox";
import { SiteContainer } from "@/components/site/site-container";
import { PhoneCountrySelect } from "@/components/ui/phone-country-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";
import { TelegramLink } from "@/lib/contact-links";
import { DEFAULT_PHONE_COUNTRY, formatPhoneDisplay, isPhoneOnlyAuthCountry } from "@/lib/phone";
import { resolvePhoneApiError } from "@/lib/phone-api-error";
import type { AppLocale } from "@/i18n/routing";

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
  const t = useTranslations("auth");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/cabinet";

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [cityId, setCityId] = useState("");
  const [countryName, setCountryName] = useState(() =>
    locale === "ru" ? DEFAULT_PHONE_COUNTRY : "",
  );
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
      const phoneOnlyAuth = isPhoneOnlyAuthCountry(countryName);
      if (result.needsTelegram && !phoneOnlyAuth) {
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
    [next, router, countryName],
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
          setError(result.error ?? t("errors.loginFailed"));
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
          data.status === "CANCELLED"
            ? t("errors.loginCancelled")
            : t("errors.loginExpired"),
        );
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [challengeToken, finishSession]);

  async function startAuth(e?: FormEvent) {
    e?.preventDefault();
    if (!phoneValid) {
      setError(t("errors.invalidPhone"));
      return;
    }
    if (!consentAccepted) {
      setError(t("errors.consentRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, countryName, locale }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(resolvePhoneApiError(data, locale, t("errors.generic")));
        return;
      }

      if (data.mode === "login") {
        setAuthFlow(data.flow === "register" ? "register" : "login");
        const phoneOnlyAuth = isPhoneOnlyAuthCountry(countryName);
        if (data.authMethod === "call" || phoneOnlyAuth) {
          if (phoneOnlyAuth && data.authMethod === "telegram") {
            await switchToCallAuth();
            return;
          }
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
        if (isPhoneOnlyAuthCountry(countryName)) {
          setError(t("errors.callStartFailed"));
          return;
        }
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
      setError(t("errors.serverTimeout"));
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(e: FormEvent) {
    e.preventDefault();
    if (!phoneValid || !cityId || firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError(t("errors.registerFields"));
      return;
    }
    if (!consentAccepted) {
      setError(t("errors.consentRequired"));
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
          locale,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(resolvePhoneApiError(data, locale, t("errors.registerFailed")));
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
      setError(t("errors.serverTimeout"));
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
        body: JSON.stringify({ phone, countryName, locale }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(resolvePhoneApiError(data, locale, t("errors.callStartFailed")));
        return;
      }
      applyCallLogin({
        challengeToken: data.challengeToken,
        callNumber: data.callNumber,
        message: data.message,
        flow: authFlow,
      });
    } catch {
      setError(t("errors.serverTimeout"));
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
  const phoneOnlyAuth = isPhoneOnlyAuthCountry(countryName);

  return (
    <div className="site-card mx-auto w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("title")}</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("lead")}</p>
      <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
        <li>
          <span className="font-medium text-[var(--text-primary)]">{t("newUserLabel")}</span>{" "}
          {phoneOnlyAuth ? (
            t("newUserTextPhoneOnly")
          ) : (
            t.rich("newUserText", {
              bot: TELEGRAM_BOT_USERNAME,
              link: () => (
                <TelegramLink
                  username={TELEGRAM_BOT_USERNAME}
                  className="font-medium text-emerald-700 underline dark:text-emerald-400"
                />
              ),
            })
          )}
        </li>
        <li>
          <span className="font-medium text-[var(--text-primary)]">{t("existingUserLabel")}</span>{" "}
          {phoneOnlyAuth ? t("existingUserTextPhoneOnly") : t("existingUserText")}
        </li>
      </ul>

      {step === "phone" && (
        <form onSubmit={startAuth} className="mt-6 space-y-4">
          <PhoneCountrySelect
            value={countryName}
            onChange={setCountryName}
            label={t("country")}
            placeholder={locale === "en" ? t("selectCountry") : undefined}
            required
          />
          <PhoneInput
            countryName={countryName}
            locale={locale}
            value={phone}
            onChange={(e164, valid) => {
              setPhone(e164);
              setPhoneValid(valid);
            }}
            labels={{
              phone: t("phoneLabel"),
              pickCountryFirst: t("pickCountryFirst"),
              hint: t("phoneHint"),
              accepted: t("phoneAccepted"),
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
            disabled={loading || !countryName || !phoneValid || !consentAccepted}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? t("checking") : t("continue")}
          </button>
        </form>
      )}

      {step === "register" && (
        <form onSubmit={submitRegister} className="mt-6 space-y-4">
          {info && <p className="text-sm text-emerald-800 dark:text-emerald-300/90">{info}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--text-secondary)]">{t("lastName")}</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="site-input w-full"
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-[var(--text-secondary)]">{t("firstName")}</span>
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
            onCountryChange={(c) => setCountryName(c?.nameRu ?? DEFAULT_PHONE_COUNTRY)}
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
            {loading ? t("registering") : t("register")}
          </button>
          <button type="button" onClick={resetToPhone} className="text-xs text-[var(--text-muted)] underline hover:text-[var(--text-primary)]">
            {t("otherNumber")}
          </button>
        </form>
      )}

      {step === "confirm" && !phoneOnlyAuth && (
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
                {t("openBot")}
              </a>
            </li>
            <li>{t("shareContact")}</li>
            <li>{t("returnAndSignIn")}</li>
          </ol>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            disabled={loading}
            onClick={() => void startAuth()}
            className="site-btn-primary w-full disabled:opacity-50"
          >
            {loading ? t("checking") : t("signInAfterConfirm")}
          </button>
          <button
            type="button"
            onClick={resetToPhone}
            className="pt-1 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
          >
            {t("otherNumber")}
          </button>
        </div>
      )}

      {step === "login" && authMethod === "call" && (
        <div className={`mt-6 ${authPanelClass} space-y-3`}>
          {info && <p className="text-sm text-emerald-800 dark:text-emerald-300">{info}</p>}
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {polling
              ? t("waitingCall")
              : authFlow === "register"
                ? t("confirmByCall")
                : t("callToSignIn")}
          </p>
          {callNumber ? (
            <>
              {phoneDisplay && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {t("callFromPhone", { phone: phoneDisplay })}
                </p>
              )}
              <p className="text-xs text-[var(--text-muted)]">{t("dialShort")}</p>
              <p className="text-center text-2xl font-bold tracking-wide text-[var(--text-primary)] tabular-nums">
                <a href={`tel:+${callNumber.replace(/\D/g, "")}`} className="hover:underline">
                  {callNumber}
                </a>
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {phoneOnlyAuth ? t("callNotActivePhoneOnly") : t("callNotActive")}
            </p>
          )}
          <ol className="list-decimal space-y-1 pl-4 text-xs text-zinc-600 dark:text-zinc-300">
            <li>{t("callStep1")}</li>
            <li>
              {authFlow === "register"
                ? phoneOnlyAuth
                  ? t("callStep2RegisterPhoneOnly")
                  : t("callStep2Register")
                : t("callStep2Login")}
            </li>
          </ol>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            onClick={resetToPhone}
            className="pt-1 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {step === "login" && authMethod === "telegram" && !phoneOnlyAuth && (
        <div className={`mt-6 ${authPanelClass} space-y-3`}>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {polling ? t("openTelegramConfirm") : t("processing")}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {t("messageSent")}
          </p>
          {callAuthEnabled && callNumber && (
            <div className="border-t border-emerald-200/80 pt-3 dark:border-emerald-900/50">
              <p className="text-xs text-[var(--text-muted)]">
                {t("orCallHint")}
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
                {t("refreshCallWait")}
              </button>
            </div>
          )}
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            onClick={resetToPhone}
            className="pt-1 text-xs text-[var(--text-muted)] underline hover:text-[var(--text-primary)]"
          >
            {t("cancel")}
          </button>
        </div>
      )}

      {step === "telegram_nudge" && (
        <div className={`mt-6 ${authPanelClass} space-y-4`}>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            {authFlow === "register" ? t("registerDone") : t("signInDone")}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            {t.rich("connectBot", {
              bot: TELEGRAM_BOT_USERNAME,
              link: () => (
                <TelegramLink
                  username={TELEGRAM_BOT_USERNAME}
                  className="font-medium text-emerald-700 underline dark:text-emerald-400"
                />
              ),
            })}
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
                {t("openBot")}
              </a>
            </li>
            <li>{t("botStepStart")}</li>
            <li>{t("botStepLater")}</li>
          </ol>
          <a
            href={botLink}
            target="_blank"
            rel="noreferrer"
            className="site-btn-primary block w-full text-center"
          >
            {t("openBotBtn")}
          </a>
          <button type="button" onClick={goToCabinet} className="site-btn-secondary w-full">
            {t("laterToCabinet")}
          </button>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        <Link href="/" className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          {t("home")}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <SiteContainer className="flex flex-1 flex-col items-center justify-center py-16">
      <Suspense fallback={<div className="text-[var(--text-muted)]">{t("loading")}</div>}>
        <LoginForm />
      </Suspense>
    </SiteContainer>
  );
}
