"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export function TournamentsSearchBar() {
  const t = useTranslations("pages.tournaments");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlQuery);

  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = value.trim();
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      const query = params.toString();
      const next = query ? `/tournaments?${query}` : "/tournaments";
      const current = searchParams.toString()
        ? `/tournaments?${searchParams.toString()}`
        : "/tournaments";
      if (next !== current) router.replace(next);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value, router, searchParams]);

  return (
    <label className="block">
      <span className="sr-only">{t("searchLabel")}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="site-input w-full max-w-xl"
        autoComplete="off"
        spellCheck={false}
      />
    </label>
  );
}
