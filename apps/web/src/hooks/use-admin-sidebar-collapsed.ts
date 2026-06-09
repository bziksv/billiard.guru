"use client";

import { useCallback, useEffect, useState } from "react";

const NARROW_MQ = "(max-width: 767px)";

export function useAdminSidebarCollapsed(storageKey: string) {
  const [collapsed, setCollapsedState] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_MQ);
    const readStored = () => localStorage.getItem(storageKey) === "1";

    const apply = () => {
      const isNarrow = mq.matches;
      setNarrow(isNarrow);
      setCollapsedState(isNarrow ? true : readStored());
      setReady(true);
    };

    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [storageKey]);

  const setCollapsed = useCallback(
    (next: boolean | ((value: boolean) => boolean)) => {
      setCollapsedState((prev) => {
        const value = typeof next === "function" ? next(prev) : next;
        if (!window.matchMedia(NARROW_MQ).matches) {
          localStorage.setItem(storageKey, value ? "1" : "0");
        }
        return value;
      });
    },
    [storageKey],
  );

  const toggle = useCallback(() => {
    setCollapsed((value) => !value);
  }, [setCollapsed]);

  return { collapsed, narrow, ready, setCollapsed, toggle };
}
