"use client";

import { HOME_TICKER_ITEMS } from "@/lib/home-content";

export function HomeTicker() {
  const line = [...HOME_TICKER_ITEMS, ...HOME_TICKER_ITEMS];

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
