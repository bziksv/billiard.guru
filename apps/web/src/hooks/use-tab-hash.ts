"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function readHashTab(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "").trim();
  return raw || null;
}

function writeHashTab(tab: string) {
  if (typeof window === "undefined") return;
  const next = `#${tab}`;
  if (window.location.hash === next) return;
  const url = `${window.location.pathname}${window.location.search}${next}`;
  window.history.replaceState(null, "", url);
}

/**
 * Синхронизирует активную вкладку с якорем в URL (`#bracket`, `#results`, …).
 * При первой загрузке с валидным хешем выбирает вкладку и прокручивает к секции.
 */
export function useTabHash<T extends string>(
  defaultTab: T,
  isAllowed: (tab: string) => tab is T,
  options?: {
    /** id элемента для scrollIntoView при открытии по якорю */
    scrollToId?: string;
  },
): [T, (tab: T) => void] {
  const [tab, setTabState] = useState<T>(defaultTab);
  const hydratedRef = useRef(false);
  const isAllowedRef = useRef(isAllowed);
  isAllowedRef.current = isAllowed;
  const scrollToId = options?.scrollToId;
  const defaultTabRef = useRef(defaultTab);
  defaultTabRef.current = defaultTab;

  const setTab = useCallback((next: T) => {
    setTabState(next);
    if (hydratedRef.current) {
      writeHashTab(next);
    }
  }, []);

  useEffect(() => {
    const fromHash = readHashTab();
    if (fromHash && isAllowedRef.current(fromHash)) {
      setTabState(fromHash);
      writeHashTab(fromHash);
      if (scrollToId) {
        requestAnimationFrame(() => {
          document.getElementById(scrollToId)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    } else {
      writeHashTab(defaultTabRef.current);
    }
    hydratedRef.current = true;

    const onHashChange = () => {
      const hash = readHashTab();
      if (hash && isAllowedRef.current(hash)) {
        setTabState(hash);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [scrollToId]);

  return [tab, setTab];
}
