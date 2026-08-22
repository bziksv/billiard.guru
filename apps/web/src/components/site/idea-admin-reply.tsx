"use client";

import { useTranslations } from "next-intl";

export function IdeaAdminReply({ reply }: { reply: string }) {
  const t = useTranslations("pages.ideas.client");

  return (
    <div
      className="border-t border-zinc-200 bg-zinc-50/90 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40"
      role="note"
      aria-label={t("adminReplyLabel")}
    >
      <div className="max-w-[95%] rounded-2xl rounded-tl-md border border-emerald-200 bg-white px-4 py-3 shadow-sm dark:border-emerald-900 dark:bg-zinc-900">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {t("adminReplyBrand")}
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {t("adminReplyRole")}
          </span>
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-zinc-800 dark:text-zinc-100">
          {reply}
        </p>
      </div>
    </div>
  );
}
