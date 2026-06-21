"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CitySelect } from "@/components/admin/city-select";
import { PersonalDataConsentCheckbox } from "@/components/site/legal/personal-data-consent-checkbox";
import { EmptyState, SiteCard } from "@/components/site/site-card";
import { PlayListingCard } from "@/components/site/play-listing-card";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CLUB_TABLE_FORMATS } from "@/lib/club-table-formats";
import {
  PLAY_LISTING_KIND_LABELS,
  PLAY_LISTING_PLAYERS_NEEDED_PRESETS,
  WEEKDAY_LABELS,
} from "@/lib/play-listing-display";
import type { SerializedPlayListing } from "@/lib/play-listing-server";

type Tab = "browse" | "create" | "mine";

const FORMAT_OPTIONS = CLUB_TABLE_FORMATS.map((f) => ({ value: f.id, label: f.label }));

export function PokatatPageClient({
  isLoggedIn,
  isVerified,
  defaultCityId,
}: {
  isLoggedIn: boolean;
  isVerified: boolean;
  defaultCityId?: string;
}) {
  const t = useTranslations("pages.pokatat.client");
  const tKind = useTranslations("playListing.kind");
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "browse";

  const kindOptions = useMemo(
    () =>
      Object.keys(PLAY_LISTING_KIND_LABELS).map((value) => ({
        value,
        label: tKind(value as "SPARRING"),
      })),
    [tKind],
  );

  const [tab, setTab] = useState<Tab>(
    initialTab === "create" || initialTab === "mine" ? initialTab : "browse",
  );
  const [listings, setListings] = useState<SerializedPlayListing[]>([]);
  const [mine, setMine] = useState<SerializedPlayListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKind, setFilterKind] = useState("");
  const [filterSchedule, setFilterSchedule] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("SPARRING");
  const [scheduleType, setScheduleType] = useState<"ONE_TIME" | "RECURRING">("ONE_TIME");
  const [cityId, setCityId] = useState(defaultCityId ?? "");
  const [clubId, setClubId] = useState("");
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [playDate, setPlayDate] = useState("");
  const [playTime, setPlayTime] = useState("19:00");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [timeFrom, setTimeFrom] = useState("19:00");
  const [timeTo, setTimeTo] = useState("22:00");
  const [gameFormat, setGameFormat] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [ratingMax, setRatingMax] = useState("");
  const [playersNeeded, setPlayersNeeded] = useState("1");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  const geoQuery = useMemo(() => {
    const q = new URLSearchParams(searchParams.toString());
    return q.toString() ? `?${q.toString()}` : "";
  }, [searchParams]);

  const reloadBrowse = useCallback(async () => {
    const params = new URLSearchParams(searchParams.toString());
    if (filterKind) params.set("kind", filterKind);
    else params.delete("kind");
    if (filterSchedule) params.set("scheduleType", filterSchedule);
    else params.delete("scheduleType");
    const res = await fetch(`/api/play-listings?${params.toString()}`);
    const data = await res.json();
    setListings(Array.isArray(data.listings) ? data.listings : []);
  }, [searchParams, filterKind, filterSchedule]);

  const reloadMine = useCallback(async () => {
    const res = await fetch("/api/play-listings?scope=mine");
    const data = await res.json();
    setMine(Array.isArray(data.listings) ? data.listings : []);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await Promise.all([reloadBrowse(), isLoggedIn ? reloadMine() : Promise.resolve()]);
    setLoading(false);
  }, [reloadBrowse, reloadMine, isLoggedIn]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (tab === "browse") reloadBrowse();
  }, [tab, filterKind, filterSchedule, reloadBrowse]);

  useEffect(() => {
    if (!cityId) {
      setClubs([]);
      setClubId("");
      return;
    }
    fetch("/api/clubs")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setClubs(
          list
            .filter((c: { cityId?: string }) => c.cityId === cityId)
            .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })),
        );
      })
      .catch(() => setClubs([]));
  }, [cityId]);

  useEffect(() => {
    if (defaultCityId && !cityId) setCityId(defaultCityId);
  }, [defaultCityId, cityId]);

  const clubOptions = useMemo(
    () => [{ value: "", label: "Любой клуб / не важно" }, ...clubs.map((c) => ({ value: c.id, label: c.name }))],
    [clubs],
  );

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
  }

  async function submitListing() {
    setSubmitError(null);
    if (!consentAccepted) {
      setSubmitError("Подтвердите согласие на обработку персональных данных");
      return;
    }
    setSubmitting(true);

    let playAt: string | undefined;
    if (scheduleType === "ONE_TIME") {
      if (!playDate) {
        setSubmitError("Укажите дату");
        setSubmitting(false);
        return;
      }
      const local = new Date(`${playDate}T${playTime}:00`);
      playAt = local.toISOString();
    }

    const payload = {
      title: title.trim(),
      body: body.trim(),
      kind,
      scheduleType,
      cityId,
      clubId: clubId || undefined,
      playAt,
      weekdays: scheduleType === "RECURRING" ? weekdays : undefined,
      timeFrom: scheduleType === "RECURRING" ? timeFrom : playTime,
      timeTo: scheduleType === "RECURRING" ? timeTo : undefined,
      gameFormat: gameFormat || undefined,
      ratingMin: ratingMin ? Number(ratingMin) : undefined,
      ratingMax: ratingMax ? Number(ratingMax) : undefined,
      playersNeeded: playersNeeded.trim() || "1",
    };

    const res = await fetch("/api/play-listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(data.error ?? t("submitError"));
      return;
    }

    setTitle("");
    setBody("");
    setTab("mine");
    router.push("/pokatat?tab=mine");
    await reload();
  }

  const tabClass = (active: boolean) =>
    active
      ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-900/40"
      : "home-card-body rounded-lg px-4 py-2 text-sm hover:text-[var(--text-primary)]";

  return (
    <div className="space-y-6">
      <div className="home-tab-bar inline-flex flex-wrap gap-1 rounded-xl p-1">
        <button type="button" onClick={() => setTab("browse")} className={tabClass(tab === "browse")}>
          {t("tabBrowse")}{listings.length > 0 ? ` (${listings.length})` : ""}
        </button>
        <button type="button" onClick={() => setTab("create")} className={tabClass(tab === "create")}>
          {t("tabCreate")}
        </button>
        {isLoggedIn && (
          <button type="button" onClick={() => setTab("mine")} className={tabClass(tab === "mine")}>
            {t("tabMine")}{mine.length > 0 ? ` (${mine.length})` : ""}
          </button>
        )}
      </div>

      {tab === "browse" && (
        <>
          <div className="flex flex-wrap gap-3">
            <SearchableSelect
              options={[{ value: "", label: t("filterAllKinds") }, ...kindOptions]}
              value={filterKind}
              onChange={setFilterKind}
              placeholder={t("filterKindPlaceholder")}
              className="min-w-[10rem]"
            />
            <SearchableSelect
              options={[
                { value: "", label: t("filterAllSchedules") },
                { value: "ONE_TIME", label: t("scheduleOneTime") },
                { value: "RECURRING", label: t("scheduleRecurring") },
              ]}
              value={filterSchedule}
              onChange={setFilterSchedule}
              placeholder={t("filterSchedulePlaceholder")}
              className="min-w-[10rem]"
            />
          </div>

          {loading ? (
            <p className="home-card-body text-sm">{t("loading")}</p>
          ) : listings.length === 0 ? (
            <>
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyDescription")}
              />
              <div className="text-center">
                {isLoggedIn ? (
                  <button type="button" onClick={() => setTab("create")} className="site-btn-primary">
                    {t("post")}
                  </button>
                ) : (
                  <Link href="/login?next=/pokatat?tab=create" className="site-btn-primary inline-flex">
                    {t("loginToPost")}
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {listings.map((listing) => (
                <PlayListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === "create" && (
        <SiteCard>
          {!isLoggedIn ? (
            <div className="home-card-body space-y-3 text-sm">
              <p>{t("loginRequired")}</p>
              <Link href="/login?next=/pokatat?tab=create" className="site-btn-primary inline-flex">
                {t("login")}
              </Link>
            </div>
          ) : !isVerified ? (
            <p className="text-sm text-amber-700 dark:text-amber-400/90">
              {t("verifyRequired")}
            </p>
          ) : (
            <form
              className="space-y-6"
              onSubmit={(e) => {
                e.preventDefault();
                submitListing();
              }}
            >
              <section className="space-y-4">
                <h3 className="site-form-section-title">{t("sectionAbout")}</h3>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  maxLength={120}
                  required
                  className="site-input w-full"
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t("bodyPlaceholder")}
                  rows={4}
                  maxLength={2000}
                  className="site-input w-full resize-y"
                />
                <p className="text-xs text-[var(--text-muted)]">{t("autoTranslateHint")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <SearchableSelect
                    label={t("kindLabel")}
                    options={kindOptions}
                    value={kind}
                    onChange={setKind}
                    required
                  />
                  <SearchableSelect
                    label={t("tableFormatLabel")}
                    options={[{ value: "", label: t("anyFormat") }, ...FORMAT_OPTIONS]}
                    value={gameFormat}
                    onChange={setGameFormat}
                  />
                </div>
              </section>

              <section className="site-section-divider space-y-4 pt-6">
                <h3 className="site-form-section-title">{t("sectionWhen")}</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleType("ONE_TIME")}
                    className={
                      scheduleType === "ONE_TIME"
                        ? "site-chip site-chip--active"
                        : "site-chip"
                    }
                  >
                    {t("scheduleOneTime")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleType("RECURRING")}
                    className={
                      scheduleType === "RECURRING"
                        ? "site-chip site-chip--active"
                        : "site-chip"
                    }
                  >
                    {t("scheduleRecurring")}
                  </button>
                </div>

                {scheduleType === "ONE_TIME" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <span className="site-form-label mb-1 block">{t("date")}</span>
                      <input
                        type="date"
                        value={playDate}
                        onChange={(e) => setPlayDate(e.target.value)}
                        required
                        min={new Date().toISOString().slice(0, 10)}
                        className="site-input w-full"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="site-form-label mb-1 block">{t("time")}</span>
                      <input
                        type="time"
                        value={playTime}
                        onChange={(e) => setPlayTime(e.target.value)}
                        required
                        className="site-input w-full"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="site-form-label mb-2">{t("weekdays")}</p>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAY_LABELS.map((label, day) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleWeekday(day)}
                            className={
                              weekdays.includes(day)
                                ? "site-chip site-chip--sm site-chip--active"
                                : "site-chip site-chip--sm"
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="site-form-label mb-1 block">{t("from")}</span>
                        <input
                          type="time"
                          value={timeFrom}
                          onChange={(e) => setTimeFrom(e.target.value)}
                          required
                          className="site-input w-full"
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="site-form-label mb-1 block">{t("to")}</span>
                        <input
                          type="time"
                          value={timeTo}
                          onChange={(e) => setTimeTo(e.target.value)}
                          className="site-input w-full"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>

              <section className="site-section-divider space-y-4 pt-6">
                <h3 className="site-form-section-title">{t("sectionWhere")}</h3>
                <CitySelect value={cityId} onChange={setCityId} required />
                <SearchableSelect
                  label={t("clubOptional")}
                  options={clubOptions}
                  value={clubId}
                  onChange={setClubId}
                  disabled={!cityId}
                  placeholder={cityId ? t("chooseClub") : t("chooseCityFirst")}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-sm">
                    <span className="site-form-label mb-1 block">{t("ratingFrom")}</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={ratingMin}
                      onChange={(e) => setRatingMin(e.target.value)}
                      placeholder="—"
                      className="site-input w-full"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="site-form-label mb-1 block">{t("ratingTo")}</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      value={ratingMax}
                      onChange={(e) => setRatingMax(e.target.value)}
                      placeholder="—"
                      className="site-input w-full"
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="site-form-label mb-1 block">{t("playersNeeded")}</span>
                    <input
                      type="text"
                      list="pokatat-players-needed"
                      value={playersNeeded}
                      onChange={(e) => setPlayersNeeded(e.target.value)}
                      placeholder="1, 2, 1-4, пара на пару…"
                      className="site-input w-full"
                      autoComplete="off"
                    />
                    <datalist id="pokatat-players-needed">
                      {PLAY_LISTING_PLAYERS_NEEDED_PRESETS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                    <p className="home-card-muted mt-1 text-xs">
                      Выберите из списка или введите своё: диапазон (1–4) или «пара на пару».
                    </p>
                  </label>
                </div>
              </section>

              {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}

              <PersonalDataConsentCheckbox
                checked={consentAccepted}
                onChange={setConsentAccepted}
                id="pokatat-consent"
              />

              <button
                type="submit"
                disabled={
                  submitting || !consentAccepted || title.trim().length < 3 || !cityId
                }
                className="site-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? t("submitting") : t("submit")}
              </button>
            </form>
          )}
        </SiteCard>
      )}

      {tab === "mine" && isLoggedIn && (
        <section className="space-y-4">
          {mine.length === 0 ? (
            <>
              <EmptyState title={t("mineEmpty")} />
              <div className="text-center">
                <button type="button" onClick={() => setTab("create")} className="site-btn-primary">
                  {t("mineCreate")}
                </button>
              </div>
            </>
          ) : (
            mine.map((listing) => (
              <PlayListingCard key={listing.id} listing={listing} showStatus />
            ))
          )}
        </section>
      )}
    </div>
  );
}
