"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const DRAG_THRESHOLD_PX = 4;

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, label, [data-bracket-interactive]",
    ),
  );
}

export function BracketScrollCenter({
  children,
  className,
  centerX,
}: {
  children: ReactNode;
  className?: string;
  centerX: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const panRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, centerX - el.clientWidth / 2);
  }, [centerX]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    const el = ref.current;
    if (!el) return;

    panRef.current = {
      active: true,
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    const pan = panRef.current;
    if (!el || !pan.active || pan.pointerId !== event.pointerId) return;

    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (!pan.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    pan.moved = true;
    el.scrollLeft = pan.scrollLeft - dx;
    el.scrollTop = pan.scrollTop - dy;
  }

  function endPan(event: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    const pan = panRef.current;
    if (!el || !pan.active || pan.pointerId !== event.pointerId) return;

    if (el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }

    if (pan.moved) {
      const blockClick = (ev: Event) => {
        if (isInteractiveTarget(ev.target)) return;
        ev.preventDefault();
        ev.stopPropagation();
      };
      el.addEventListener("click", blockClick, { capture: true, once: true });
    }

    panRef.current.active = false;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "cursor-grab touch-pan-x touch-pan-y select-none active:cursor-grabbing",
        className,
      )}
      onPointerDownCapture={onPointerDown}
      onPointerMoveCapture={onPointerMove}
      onPointerUpCapture={endPan}
      onPointerCancelCapture={endPan}
    >
      {children}
    </div>
  );
}
