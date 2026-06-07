"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function AdminHorizontalScroll({
  children,
  className,
  trackClassName,
}: {
  children: ReactNode;
  className?: string;
  trackClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 1;
    setFadeLeft(overflow && scrollLeft > 2);
    setFadeRight(overflow && scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update, children]);

  return (
    <div className={cn("admin-horizontal-scroll", className)}>
      {fadeLeft ? (
        <div
          className="admin-horizontal-scroll__fade admin-horizontal-scroll__fade--left"
          aria-hidden
        />
      ) : null}
      <div
        ref={ref}
        className={cn("admin-horizontal-scroll__track", trackClassName)}
        tabIndex={0}
        role="region"
        aria-label="Прокрутка панели"
      >
        {children}
      </div>
      {fadeRight ? (
        <div
          className="admin-horizontal-scroll__fade admin-horizontal-scroll__fade--right"
          aria-hidden
        >
          <span className="admin-horizontal-scroll__hint" aria-hidden>
            ›
          </span>
        </div>
      ) : null}
    </div>
  );
}
