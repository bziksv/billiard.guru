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
  contentHeight,
  contentScrollY = "center",
}: {
  children: ReactNode;
  className?: string;
  centerX: number;
  /** Для высоких fixed-сеток — начальная прокрутка по вертикали. */
  contentHeight?: number;
  contentScrollY?: "center" | "start";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const userAdjustedRef = useRef(false);
  /** Автоцентрирование только при первом показе; смена высоты (галочки) не сбрасывает скролл. */
  const hasAutoCenteredRef = useRef(false);
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
    userAdjustedRef.current = false;
    hasAutoCenteredRef.current = false;
  }, [centerX]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function clampScroll(node: HTMLDivElement) {
      const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
      if (node.scrollLeft > maxScrollLeft) {
        node.scrollLeft = maxScrollLeft;
      }
      if (contentHeight != null) {
        const maxScrollTop = Math.max(0, contentHeight - node.clientHeight);
        if (node.scrollTop > maxScrollTop) {
          node.scrollTop = maxScrollTop;
        }
      }
    }

    function applyAutoScroll() {
      const node = ref.current;
      if (!node) return;

      if (userAdjustedRef.current || hasAutoCenteredRef.current) {
        clampScroll(node);
        return;
      }

      const content = node.firstElementChild as HTMLElement | null;
      const contentWidth = content?.scrollWidth ?? content?.offsetWidth ?? 0;
      const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);

      if (contentWidth > node.clientWidth + 1) {
        node.scrollLeft = Math.min(
          maxScrollLeft,
          Math.max(0, centerX - node.clientWidth / 2),
        );
      } else {
        node.scrollLeft = 0;
      }
      if (contentHeight != null && contentHeight > node.clientHeight) {
        node.scrollTop =
          contentScrollY === "start"
            ? 0
            : Math.max(0, (contentHeight - node.clientHeight) / 2);
      }
      hasAutoCenteredRef.current = true;
    }

    applyAutoScroll();

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(applyAutoScroll);
    });
    ro.observe(el);
    const content = el.firstElementChild;
    if (content) ro.observe(content);

    return () => ro.disconnect();
  }, [centerX, contentHeight, contentScrollY]);

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
    userAdjustedRef.current = true;
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
        "w-full max-w-full min-w-0 cursor-grab touch-pan-x touch-pan-y select-none active:cursor-grabbing",
        className,
      )}
      onPointerDownCapture={onPointerDown}
      onPointerMoveCapture={onPointerMove}
      onPointerUpCapture={endPan}
      onPointerCancelCapture={endPan}
    >
      <div className="mx-auto w-max text-left">{children}</div>
    </div>
  );
}
