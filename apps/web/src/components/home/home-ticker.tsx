"use client";

import { useTranslations } from "next-intl";

const TICKER_KEYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export function HomeTicker() {
  const t = useTranslations("home.ticker");
  const items = TICKER_KEYS.map((key) => t(key));
  const line = [...items, ...items];

  return (
    <div className="home-ticker-bar overflow-hidden border-y py-2.5">
      <div className="home-ticker flex w-max gap-8">
        {line.map((text, i) => (
          <span
            key={`${text}-${i}`}
            className="flex shrink-0 items-center gap-8 text-sm text-zinc-500"
          >
            <span>{text}</span>
            <span className="text-emerald-700">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}
