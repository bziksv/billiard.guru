"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { AsyncButton } from "@/components/ui/async-text-button";
import { cn } from "@/lib/cn";

type ClubConfirmState = {
  isVerified: boolean;
  telegramId: string | null;
  telegramUsername: string | null;
  confirmLink: string | null;
  ownerPlayer: {
    id: string;
    name: string;
    telegramId: string | null;
    isVerified: boolean;
  } | null;
  canSendTelegram: boolean;
  canBindFromOwner: boolean;
};

type ConfirmAction = "regenerate" | "send_telegram" | "bind_from_owner";

export function ClubConfirmPanel({
  clubId,
  variant = "admin",
}: {
  clubId: string;
  variant?: "admin" | "manage";
}) {
  const [state, setState] = useState<ClubConfirmState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isManage = variant === "manage";
  const sectionClass = cn(
    "space-y-4 p-6",
    isManage
      ? "rounded-xl border border-zinc-800 bg-zinc-950"
      : "admin-card",
  );
  const titleClass = isManage ? "font-semibold" : "admin-section-title";
  const mutedClass = isManage ? "text-sm text-zinc-500" : "admin-muted text-sm";
  const secondaryClass = isManage ? "text-sm text-zinc-400" : "admin-text-secondary text-sm";
  const insetClass = isManage
    ? "space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
    : "admin-inset space-y-2 rounded-lg p-4";
  const labelClass = isManage ? "text-xs text-zinc-500" : "admin-label-xs";
  const linkClass = isManage
    ? "block break-all text-sm text-emerald-400 underline"
    : "admin-link block break-all text-sm underline";
  const btnSecondary = isManage
    ? "rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-emerald-600"
    : "admin-btn admin-btn--secondary rounded-lg px-4 py-2 text-sm";
  const btnPrimary = isManage
    ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
    : "admin-btn admin-btn--primary rounded-lg px-4 py-2 text-sm";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/clubs/${clubId}/confirm`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось загрузить статус");
      return;
    }
    setState(data);
  }, [clubId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: ConfirmAction) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/clubs/${clubId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    setState(data);
    setMessage(
      action === "regenerate"
        ? "Новая ссылка сгенерирована"
        : action === "bind_from_owner"
          ? "Telegram клуба привязан из профиля владельца"
          : isManage
            ? "Сообщение отправлено в ваш Telegram"
            : "Сообщение отправлено в Telegram владельцу",
    );
  }

  if (loading) {
    return (
      <section className={sectionClass}>
        <h2 className={titleClass}>Подтверждение владения</h2>
        <p className={mutedClass}>Загрузка…</p>
      </section>
    );
  }

  if (!state) {
    return (
      <section className={sectionClass}>
        <h2 className={titleClass}>Подтверждение владения</h2>
        <p className="text-sm text-red-400">{error ?? "Нет данных"}</p>
      </section>
    );
  }

  const needsTelegram = !state.telegramId;
  const badgeStatus = state.telegramId
    ? "CONFIRMED"
    : state.isVerified
      ? "PENDING"
      : "PENDING";
  const badgeLabel = state.telegramId
    ? "Подтверждён"
    : state.isVerified
      ? "Нужен Telegram"
      : "Ожидает Telegram";

  return (
    <section className={sectionClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={titleClass}>Подтверждение владения</h2>
        <StatusBadge status={badgeStatus} label={badgeLabel} />
      </div>

      {!needsTelegram ? (
        <div className={cn(secondaryClass, "space-y-1")}>
          <p>
            Telegram клуба:{" "}
            {state.telegramUsername ? (
              <span className={isManage ? "font-mono text-zinc-200" : "admin-code"}>
                @{state.telegramUsername}
              </span>
            ) : (
              <span className={isManage ? "font-mono text-zinc-200" : "admin-code"}>
                {state.telegramId}
              </span>
            )}
          </p>
          {!isManage && state.ownerPlayer && (
            <p>
              Владелец по телефону: {state.ownerPlayer.name}
              {state.ownerPlayer.isVerified ? "" : " (профиль не подтверждён)"}
            </p>
          )}
        </div>
      ) : (
        <>
          {state.isVerified && (
            <p
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                isManage
                  ? "border-amber-700/50 bg-amber-950/30 text-amber-200"
                  : "border-amber-300 bg-amber-50 text-amber-900",
              )}
            >
              Владение подтверждено по телефону, но Telegram клуба ещё не привязан.
              Без этого нельзя создавать турниры.
            </p>
          )}

          <p className={secondaryClass}>
            {state.canBindFromOwner
              ? isManage
                ? "Ваш Telegram уже в профиле — нажмите «Привязать мой Telegram», либо откройте ссылку в боте."
                : "У владельца уже есть Telegram в профиле — можно привязать его к клубу одной кнопкой или отправить ссылку в бот."
              : isManage
                ? "Подтвердите клуб в Telegram — откройте ссылку или нажмите «Отправить в Telegram»."
                : "Владелец должен открыть ссылку в Telegram и подтвердить клуб. Телефон владельца — в блоке «Телефоны» ниже."}
          </p>

          {!isManage && state.ownerPlayer && (
            <p className={mutedClass}>
              Игрок по телефону: {state.ownerPlayer.name}
              {state.ownerPlayer.telegramId
                ? state.ownerPlayer.isVerified
                  ? " · Telegram привязан"
                  : " · Telegram есть, профиль не подтверждён"
                : " · Telegram не привязан — отправка в бот недоступна"}
            </p>
          )}

          {state.confirmLink && (
            <div className={insetClass}>
              <p className={labelClass}>Ссылка для подтверждения</p>
              <a
                href={state.confirmLink}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {state.confirmLink}
              </a>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {state.canBindFromOwner && (
              <AsyncButton
                onClick={() => runAction("bind_from_owner")}
                loadingLabel="Привязка…"
                className={btnPrimary}
              >
                {isManage ? "Привязать мой Telegram" : "Привязать Telegram владельца"}
              </AsyncButton>
            )}
            <AsyncButton
              onClick={() => runAction("regenerate")}
              loadingLabel="Генерация…"
              className={btnSecondary}
            >
              Сгенерировать новую ссылку
            </AsyncButton>
            <AsyncButton
              onClick={() => runAction("send_telegram")}
              loadingLabel="Отправка…"
              disabled={!state.canSendTelegram}
              className={state.canBindFromOwner ? btnSecondary : btnPrimary}
            >
              Отправить в Telegram
            </AsyncButton>
          </div>

          {!state.canSendTelegram && (
            <p className={cn(mutedClass, "text-xs")}>
              {isManage
                ? "Привяжите Telegram к профилю на сайте (вход через бота), затем повторите отправку."
                : "Чтобы отправить в бот, владелец должен сначала привязать Telegram к своему профилю."}
            </p>
          )}
        </>
      )}

      {message && (
        <p className={cn("text-sm font-medium", isManage ? "text-emerald-400" : "text-emerald-600")}>
          {message}
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
