"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const DRAG_THRESHOLD_PX = 4;
const MIN_PINCH_SCALE = 0.35;
const MAX_PINCH_SCALE = 3;

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, a, input, textarea, select, label, [data-bracket-interactive]",
    ),
  );
}

function pointerDistance(points: Map<number, { x: number; y: number }>): number {
  const values = [...points.values()];
  if (values.length < 2) return 0;
  return Math.hypot(values[1].x - values[0].x, values[1].y - values[0].y);
}

function pointerCenter(points: Map<number, { x: number; y: number }>) {
  const values = [...points.values()];
  if (values.length < 2) return { x: 0, y: 0 };
  return {
    x: (values[0].x + values[1].x) / 2,
    y: (values[0].y + values[1].y) / 2,
  };
}

function clampPinchScale(value: number) {
  return Math.min(MAX_PINCH_SCALE, Math.max(MIN_PINCH_SCALE, value));
}

type ZoomScrollAdjust = {
  prevScale: number;
  nextScale: number;
  focalClientX: number;
  focalClientY: number;
};

/**
 * Точка в координатах контента C = scroll + focalViewport.
 * После zoom ratio: scroll' = C * ratio - focalViewport.
 */
function zoomScrollToFocal(
  el: HTMLDivElement,
  prevScale: number,
  nextScale: number,
  focalClientX: number,
  focalClientY: number,
) {
  if (prevScale === nextScale) return;
  const rect = el.getBoundingClientRect();
  const focalX = focalClientX - rect.left;
  const focalY = focalClientY - rect.top;
  const ratio = nextScale / prevScale;

  el.scrollLeft = (el.scrollLeft + focalX) * ratio - focalX;
  el.scrollTop = (el.scrollTop + focalY) * ratio - focalY;

  const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
  el.scrollLeft = Math.min(Math.max(0, el.scrollLeft), maxScrollLeft);
  const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
  el.scrollTop = Math.min(Math.max(0, el.scrollTop), maxScrollTop);
}

export function BracketScrollCenter({
  children,
  className,
  centerX,
  contentHeight,
  contentScrollY = "center",
  enablePinchZoom = false,
}: {
  children: ReactNode;
  className?: string;
  centerX: number;
  contentHeight?: number;
  contentScrollY?: "center" | "start";
  enablePinchZoom?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const userAdjustedRef = useRef(false);
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
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ active: false, startDistance: 0, startScale: 1 });
  const scaleRef = useRef(1);
  const zoomAdjustRef = useRef<ZoomScrollAdjust | null>(null);
  const [scale, setScale] = useState(1);
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 });

  scaleRef.current = scale;

  useLayoutEffect(() => {
    const adjust = zoomAdjustRef.current;
    const el = ref.current;
    if (!adjust || !el) return;

    zoomScrollToFocal(
      el,
      adjust.prevScale,
      adjust.nextScale,
      adjust.focalClientX,
      adjust.focalClientY,
    );
    zoomAdjustRef.current = null;
  }, [scale]);

  useEffect(() => {
    userAdjustedRef.current = false;
    hasAutoCenteredRef.current = false;
    scaleRef.current = 1;
    setScale(1);
  }, [centerX]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    function measure() {
      const node = contentRef.current;
      if (!node) return;
      const currentScale = scaleRef.current || 1;
      setBaseSize({
        w: node.offsetWidth / currentScale,
        h: node.offsetHeight / currentScale,
      });
    }

    measure();
    const ro = new ResizeObserver(() => {
      if (pinchRef.current.active) return;
      requestAnimationFrame(measure);
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [children, enablePinchZoom]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function clampScroll(node: HTMLDivElement) {
      const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
      node.scrollLeft = Math.min(Math.max(0, node.scrollLeft), maxScrollLeft);
      const maxScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
      node.scrollTop = Math.min(Math.max(0, node.scrollTop), maxScrollTop);
    }

    function applyAutoScroll() {
      const node = ref.current;
      if (!node) return;

      if (userAdjustedRef.current || hasAutoCenteredRef.current) {
        clampScroll(node);
        return;
      }

      const currentScale = enablePinchZoom ? scaleRef.current : 1;
      const contentWidth = enablePinchZoom
        ? baseSize.w * currentScale
        : (() => {
            const inner = node.firstElementChild as HTMLElement | null;
            return inner?.scrollWidth ?? inner?.offsetWidth ?? 0;
          })();
      const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth);
      const scaledCenterX = centerX * currentScale;

      if (contentWidth > node.clientWidth + 1) {
        node.scrollLeft = Math.min(
          maxScrollLeft,
          Math.max(0, scaledCenterX - node.clientWidth / 2),
        );
      } else {
        node.scrollLeft = 0;
      }

      const scrollContentHeight = enablePinchZoom
        ? baseSize.h * currentScale
        : contentHeight;
      if (scrollContentHeight != null && scrollContentHeight > node.clientHeight) {
        node.scrollTop =
          contentScrollY === "start"
            ? 0
            : Math.max(0, (scrollContentHeight - node.clientHeight) / 2);
      }
      hasAutoCenteredRef.current = true;
    }

    applyAutoScroll();

    const ro = new ResizeObserver(() => {
      if (pinchRef.current.active) return;
      requestAnimationFrame(applyAutoScroll);
    });
    ro.observe(el);
    const outerContent = el.firstElementChild;
    if (outerContent) ro.observe(outerContent);

    return () => ro.disconnect();
  }, [centerX, contentHeight, contentScrollY, enablePinchZoom, baseSize.h, baseSize.w]);

  function queueScale(nextScale: number) {
    const prevScale = scaleRef.current;
    const clamped = clampPinchScale(nextScale);
    if (clamped === prevScale) return;

    const center = pointerCenter(pointersRef.current);
    zoomAdjustRef.current = {
      prevScale,
      nextScale: clamped,
      focalClientX: center.x,
      focalClientY: center.y,
    };
    scaleRef.current = clamped;
    setScale(clamped);
  }

  function cancelPan() {
    const el = ref.current;
    const pan = panRef.current;
    if (el && pan.active && pan.pointerId >= 0 && el.hasPointerCapture(pan.pointerId)) {
      el.releasePointerCapture(pan.pointerId);
    }
    panRef.current.active = false;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    const el = ref.current;
    if (!el) return;

    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (enablePinchZoom && pointersRef.current.size >= 2) {
      cancelPan();
      pinchRef.current = {
        active: true,
        startDistance: pointerDistance(pointersRef.current),
        startScale: scaleRef.current,
      };
      userAdjustedRef.current = true;
      return;
    }

    if (pointersRef.current.size > 1) return;

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
    if (!el) return;

    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    if (enablePinchZoom && pointersRef.current.size >= 2 && pinchRef.current.active) {
      const distance = pointerDistance(pointersRef.current);
      if (pinchRef.current.startDistance > 0 && distance > 0) {
        const next =
          pinchRef.current.startScale * (distance / pinchRef.current.startDistance);
        queueScale(next);
      }
      return;
    }

    const pan = panRef.current;
    if (!pan.active || pan.pointerId !== event.pointerId) return;

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
    if (!el) return;

    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current.active = false;
    }

    const pan = panRef.current;
    if (!pan.active || pan.pointerId !== event.pointerId) return;

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
        "w-full max-w-full min-w-0 cursor-grab select-none active:cursor-grabbing",
        enablePinchZoom ? "touch-none" : "touch-pan-x touch-pan-y",
        className,
      )}
      onPointerDownCapture={onPointerDown}
      onPointerMoveCapture={onPointerMove}
      onPointerUpCapture={endPan}
      onPointerCancelCapture={endPan}
    >
      {enablePinchZoom ? (
        <div
          ref={contentRef}
          className="w-max origin-top-left text-left"
          style={{ zoom: scale }}
        >
          {children}
        </div>
      ) : (
        <div className="mx-auto w-max text-left">{children}</div>
      )}
    </div>
  );
}
