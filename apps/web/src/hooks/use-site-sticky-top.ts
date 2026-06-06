"use client";

import { useEffect, useState } from "react";

const TOP_SHELL_SELECTOR = ".site-top-shell";

/** Высота липкой шапки (бета-баннер + header + preview), для sticky-панелей под ней. */
export function useSiteStickyTop(): number | undefined {
  const [top, setTop] = useState<number | undefined>(undefined);

  useEffect(() => {
    const shell = document.querySelector(TOP_SHELL_SELECTOR);
    if (!shell) return;

    const update = () => {
      setTop(Math.ceil(shell.getBoundingClientRect().height));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(shell);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return top;
}
