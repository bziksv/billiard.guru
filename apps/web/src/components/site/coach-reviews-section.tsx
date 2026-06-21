"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CoachReviewStarInput, CoachReviewStars } from "@/components/site/coach-review-stars";
import { PersonalDataConsentCheckbox } from "@/components/site/legal/personal-data-consent-checkbox";
import { SiteCard } from "@/components/site/site-card";
import { formatCoachReviewAvg } from "@/lib/coach-review-display";
import { resolveLocalizedField } from "@/lib/localized-db-text";
import { cn } from "@/lib/cn";
import type { AppLocale } from "@/i18n/routing";

type ReviewRow = {
  id: string;
  score: number;
  comment: string | null;
  commentEn?: string | null;
  createdAt: string;
  updatedAt: string;
  rater: { id: string; name: string };
};

type ReviewsPayload = {
  summary: { avg: number | null; count: number };
  myReview: { score: number; comment: string | null } | null;
  reviews: ReviewRow[];
};

export function CoachReviewsSection({
  coachId,
  loggedIn,
  isSelf,
}: {
  coachId: string;
  loggedIn: boolean;
  isSelf: boolean;
}) {
  const t = useTranslations("coachReviews");
  const tPlayer = useTranslations("detail.player");
  const locale = useLocale() as AppLocale;
  const [data, setData] = useState<ReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/coaches/${coachId}/reviews`);
      if (!res.ok) throw new Error("load");
      const json = (await res.json()) as ReviewsPayload;
      setData(json);
      if (json.myReview) {
        setScore(json.myReview.score);
        setComment(json.myReview.comment ?? "");
      }
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [coachId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (score < 1) {
      setError(t("selectRating"));
      return;
    }
    if (!consentAccepted) {
      setError(t("consentRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/coaches/${coachId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment: comment.trim() || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : t("saveError"));
        return;
      }
      setSaved(true);
      await load();
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  const summary = data?.summary ?? { avg: null, count: 0 };
  const dateLocale = locale === "en" ? "en-US" : "ru-RU";

  return (
    <section>
      <h2 className="site-section-title mb-1">{t("sectionTitle")}</h2>
      <p className="home-card-muted mb-4 text-sm">{t("sectionLead")}</p>

      <SiteCard className="space-y-6">
        {loading ? (
          <div className="site-skeleton h-16" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {summary.count > 0 && summary.avg != null ? (
                <>
                  <CoachReviewStars score={summary.avg} />
                  <span className="font-mono text-2xl font-semibold text-emerald-500">
                    {formatCoachReviewAvg(summary.avg, summary.count)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {tPlayer("reviewCount", { count: summary.count })}
                  </span>
                </>
              ) : (
                <p className="text-sm text-zinc-500">{t("noRatingsYet")}</p>
              )}
            </div>

            {loggedIn && !isSelf && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]/40 p-4">
                <p className="mb-3 text-sm font-medium text-[var(--text-primary)]">
                  {data?.myReview ? t("yourReview") : t("rateCoach")}
                </p>
                <CoachReviewStarInput value={score} onChange={setScore} disabled={saving} />
                <label className="mt-4 block">
                  <span className="mb-1 block text-xs text-zinc-500">{t("commentLabel")}</span>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={saving}
                    rows={3}
                    maxLength={2000}
                    className="site-input w-full resize-y text-sm"
                    placeholder={t("commentPlaceholder")}
                  />
                </label>
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                {saved && <p className="mt-2 text-sm text-emerald-600">{t("thankYou")}</p>}
                <PersonalDataConsentCheckbox
                  checked={consentAccepted}
                  onChange={setConsentAccepted}
                  id={`coach-review-consent-${coachId}`}
                  className="mt-4"
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={saving || score < 1 || !consentAccepted}
                  className={cn("site-btn-primary mt-4 text-sm", saving && "opacity-60")}
                >
                  {saving ? t("saving") : data?.myReview ? t("update") : t("submit")}
                </button>
              </div>
            )}

            {isSelf && <p className="text-sm text-zinc-500">{t("cannotRateSelf")}</p>}

            {!loggedIn && (
              <p className="text-sm text-zinc-500">
                <Link href="/login" className="text-emerald-600 underline-offset-2 hover:underline">
                  {t("signInToRate")}
                </Link>
                {t("signInToRateSuffix")}
              </p>
            )}

            {data && data.reviews.length > 0 && (
              <ul className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-2">
                {data.reviews.map((r) => (
                  <li key={r.id} className="py-4 first:pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <CoachReviewStars score={r.score} size="sm" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">{r.rater.name}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(r.updatedAt ?? r.createdAt).toLocaleDateString(dateLocale)}
                      </span>
                    </div>
                    {r.comment?.trim() && (
                      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                        {resolveLocalizedField(locale, r.comment.trim(), r.commentEn)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </SiteCard>
    </section>
  );
}
