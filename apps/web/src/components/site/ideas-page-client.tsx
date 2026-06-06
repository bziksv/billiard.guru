"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PersonalDataConsentCheckbox } from "@/components/site/legal/personal-data-consent-checkbox";
import { EmptyState, SiteCard } from "@/components/site/site-card";
import { IDEA_STATUS_LABELS } from "@/lib/validators";

interface IdeaView {
  id: string;
  title: string;
  body: string;
  status: string;
  clubId?: string | null;
  clubName?: string | null;
  likesCount: number;
  dislikesCount: number;
  rejectReason: string | null;
  createdAt: string;
  myVote: "LIKE" | "DISLIKE" | null;
  author: { id: string; firstName: string; lastName: string };
}

type Tab = "ideas" | "submit" | "mine";

export function IdeasPageClient({
  isLoggedIn,
  isVerified,
}: {
  isLoggedIn: boolean;
  isVerified: boolean;
}) {
  const [tab, setTab] = useState<Tab>("ideas");
  const [approved, setApproved] = useState<IdeaView[]>([]);
  const [mine, setMine] = useState<IdeaView[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch("/api/ideas");
    const data = await res.json();
    setApproved(Array.isArray(data.approved) ? data.approved : []);
    setMine(Array.isArray(data.mine) ? data.mine : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function submitIdea() {
    setSubmitError(null);
    setSubmitMessage(null);
    if (!consentAccepted) {
      setSubmitError("Подтвердите согласие на обработку персональных данных");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setSubmitError(data.error ?? "Ошибка отправки");
      return;
    }
    setTitle("");
    setBody("");
    setSubmitMessage("Идея отправлена на модерацию. Мы уведомим вас в Telegram после проверки.");
    setTab("mine");
    await reload();
  }

  async function vote(ideaId: string, value: "LIKE" | "DISLIKE") {
    if (!isLoggedIn) return;
    setVotingId(ideaId);
    const res = await fetch(`/api/ideas/${ideaId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const data = await res.json();
    setVotingId(null);
    if (!res.ok) {
      alert(data.error ?? "Не удалось проголосовать");
      return;
    }
    setApproved((list) =>
      list.map((idea) =>
        idea.id === ideaId
          ? {
              ...idea,
              likesCount: data.likesCount,
              dislikesCount: data.dislikesCount,
              myVote: data.myVote,
            }
          : idea,
      ),
    );
  }

  const tabClass = (active: boolean) =>
    active
      ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
      : "home-card-body rounded-lg px-4 py-2 text-sm hover:text-[var(--text-primary)]";

  return (
    <div className="space-y-6">
      <div className="home-tab-bar inline-flex flex-wrap gap-1 rounded-xl p-1">
        <button type="button" onClick={() => setTab("ideas")} className={tabClass(tab === "ideas")}>
          Идеи{approved.length > 0 ? ` (${approved.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("submit")}
          className={tabClass(tab === "submit")}
        >
          Предложить
        </button>
        {isLoggedIn && (
          <button type="button" onClick={() => setTab("mine")} className={tabClass(tab === "mine")}>
            Мои{mine.length > 0 ? ` (${mine.length})` : ""}
          </button>
        )}
      </div>

      {tab === "ideas" && (
        <section className="space-y-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Загрузка…</p>
          ) : approved.length === 0 ? (
            <EmptyState
              title="Пока нет опубликованных идей"
              description="Станьте первым — предложите улучшение для billiard.guru"
            />
          ) : (
            approved.map((idea) => (
              <SiteCard key={idea.id}>
                <h2 className="text-lg font-semibold text-zinc-100">{idea.title}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{idea.body}</p>
                <p className="mt-3 text-xs text-zinc-500">
                  {idea.clubName ? (
                    <>
                      <span className="text-amber-400/90">Клуб «{idea.clubName}»</span>
                      {" · "}
                      {idea.author.lastName} {idea.author.firstName}
                    </>
                  ) : (
                    <>
                      {idea.author.lastName} {idea.author.firstName}
                    </>
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <VoteButton
                    active={idea.myVote === "LIKE"}
                    disabled={!isLoggedIn || votingId === idea.id}
                    loading={votingId === idea.id}
                    onClick={() => vote(idea.id, "LIKE")}
                    label={`👍 ${idea.likesCount}`}
                  />
                  <VoteButton
                    active={idea.myVote === "DISLIKE"}
                    disabled={!isLoggedIn || votingId === idea.id}
                    loading={votingId === idea.id}
                    onClick={() => vote(idea.id, "DISLIKE")}
                    label={`👎 ${idea.dislikesCount}`}
                  />
                  {!isLoggedIn && (
                    <Link href="/login?next=/ideas" className="text-xs text-emerald-400 hover:underline">
                      Войдите, чтобы голосовать
                    </Link>
                  )}
                </div>
              </SiteCard>
            ))
          )}
        </section>
      )}

      {tab === "submit" && (
        <SiteCard>
          {!isLoggedIn ? (
            <div className="space-y-3 text-sm text-zinc-400">
              <p>Предлагать идеи могут зарегистрированные игроки.</p>
              <Link href="/login?next=/ideas" className="text-emerald-400 hover:underline">
                Войти
              </Link>
            </div>
          ) : !isVerified ? (
            <p className="text-sm text-amber-400/90">
              Подтвердите регистрацию в Telegram — после этого можно отправлять идеи.
            </p>
          ) : (
            <div className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Заголовок идеи"
                maxLength={120}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Опишите идею: что улучшить, зачем это нужно сообществу"
                rows={6}
                maxLength={2000}
                className="w-full resize-y rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              />
              {submitError && <p className="text-sm text-red-400">{submitError}</p>}
              {submitMessage && <p className="text-sm text-emerald-400">{submitMessage}</p>}
              <PersonalDataConsentCheckbox
                checked={consentAccepted}
                onChange={setConsentAccepted}
                id="ideas-consent"
              />
              <button
                type="button"
                disabled={
                  submitting ||
                  !consentAccepted ||
                  title.trim().length < 3 ||
                  body.trim().length < 10
                }
                onClick={submitIdea}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Отправка…" : "Отправить на модерацию"}
              </button>
            </div>
          )}
        </SiteCard>
      )}

      {tab === "mine" && isLoggedIn && (
        <section className="space-y-4">
          {mine.length === 0 ? (
            <EmptyState title="Вы ещё не предлагали идей" />
          ) : (
            mine.map((idea) => (
              <SiteCard key={idea.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-semibold text-zinc-100">{idea.title}</h2>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {IDEA_STATUS_LABELS[idea.status] ?? idea.status}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{idea.body}</p>
                {idea.status === "APPROVED" && (
                  <p className="mt-3 text-xs text-zinc-500">
                    👍 {idea.likesCount} · 👎 {idea.dislikesCount}
                  </p>
                )}
                {idea.status === "REJECTED" && idea.rejectReason && (
                  <p className="mt-2 text-xs text-red-400/90">Причина: {idea.rejectReason}</p>
                )}
              </SiteCard>
            ))
          )}
        </section>
      )}
    </div>
  );
}

function VoteButton({
  active,
  disabled,
  loading,
  onClick,
  label,
}: {
  active: boolean;
  disabled: boolean;
  loading?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-emerald-600 bg-emerald-950/40 text-emerald-300"
          : "border-zinc-700 text-zinc-300 hover:border-zinc-500"
      }`}
    >
      {loading && (
        <span className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {label}
    </button>
  );
}
