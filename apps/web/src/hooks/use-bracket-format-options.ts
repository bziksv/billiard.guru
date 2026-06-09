"use client";

import { useCallback, useEffect, useState } from "react";
import { FORMAT_OPTIONS } from "@/lib/bracket-formats/catalog";

export type BracketFormatSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function firstSelectableFormat(
  options: BracketFormatSelectOption[],
): string | undefined {
  return options.find((o) => !o.disabled)?.value;
}

/** Форматы из /admin/brackets: только доступные для выбора (без техобслуживания). */
export function useBracketFormatOptions(
  /** Текущий формат турнира — оставить в списке даже если выключен */
  includeValue?: string,
): {
  options: BracketFormatSelectOption[];
  loading: boolean;
  reload: () => void;
} {
  const [options, setOptions] = useState<BracketFormatSelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch("/api/bracket-formats/options", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (cancelled || !r.ok || !Array.isArray(json.options)) return;
        let next = json.options as BracketFormatSelectOption[];
        if (includeValue && !next.some((o) => o.value === includeValue)) {
          const extra = FORMAT_OPTIONS.find((o) => o.value === includeValue);
          if (extra) next = [...next, { ...extra, disabled: true }];
        }
        if (next.length > 0) setOptions(next);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [includeValue, reloadToken]);

  return { options, loading, reload };
}
