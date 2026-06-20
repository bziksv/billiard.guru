"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const DRAG_THRESHOLD_PX = 4;
const MIN_PINCH_SCALE = 0.35;
const MAX_PINCH_SCALE = 3;

type Viewport = { scale: number; x: number; y: number };

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

function clampScale(value: number) {
  return Math.min(MAX_PINCH_SCALE, Math.max(MIN_PINCH_SCALE, value));
}

function clampViewport(
  x: number,
  y: number,
  scale: number,
  cw: number,
  ch: number,
  nw: number,
  nh: number,
): Viewport {
  const contentW = nw * scale;
  const contentH = nh * scale;

  let tx: number;
  let ty: number;

  if (contentW <= cw) {
    tx = (cw - contentW) / 2;
  } else {
    tx = Math.min(0, Math.max(cw - contentW, x));
  }

  if (contentH <= ch) {
    ty = (ch - contentH) / 2;
  } else {
    ty = Math.min(0, Math.max(ch - contentH, y));
  }

  return { scale, x: tx, y: ty };
}

/** Zoom вокруг точки fx,fy (координаты внутри viewport). */
function zoomAtFocal(
  fx: number,
  fy: number,
  prev: Viewport,
  nextScale: number,
  cw: number,
  ch: number,
  nw: number,
  nh: number,
): Viewport {
  const scale = clampScale(nextScale);
  if (scale === prev.scale) return prev;

  const ux = (fx - prev.x) / prev.scale;
  const uy = (fy - prev.y) / prev.scale;
  const x = fx - ux * scale;
  const y = fy - uy * scale;
  return clampViewport(x, y, scale, cw, ch, nw, nh);
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
  const viewRef = useRef<Viewport>({ scale: 1, x: 0, y: 0 });
  const userAdjustedRef = useRef(false);
  const hasAutoCenteredRef = useRef(false);
  const panRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    viewX: 0,
    viewY: 0,
  });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ active: false, startDistance: 0, startScale: 1 });
  const [view, setView] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [baseSize, setBaseSize] = useState({ w: 0, h: 0 });

  viewRef.current = view;

  const setViewSafe = (next: Viewport) => {
    viewRef.current = next;
    setView(next);
  };

  // --- Scroll mode (без pinch) ---
  const scrollUserAdjustedRef = useRef(false);
  const scrollHasAutoCenteredRef = useRef(false);
  const scrollPanRef = useRef({
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
    scrollUserAdjustedRef.current = false;
    scrollHasAutoCenteredRef.current = false;
    const initial = { scale: 1, x: 0, y: 0 };
    viewRef.current = initial;
    setView(initial);
  }, [centerX]);

  useLayoutEffect(() => {
    if (!enablePinchZoom) return;
    const el = ref.current;
    const content = contentRef.current;
    if (!el || !content || baseSize.w <= 0 || baseSize.h <= 0) return;
    if (userAdjustedRef.current || hasAutoCenteredRef.current) return;

    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const s = 1;
    const x = cw / 2 - centerX * s;
    const y =
      contentScrollY === "start"
        ? 0
        : contentHeight != null
          ? ch / 2 - (contentHeight * s) / 2
          : ch / 2 - (baseSize.h * s) / 2;

    const next = clampViewport(x, y, s, cw, ch, baseSize.w, baseSize.h);
    setViewSafe(next);
    hasAutoCenteredRef.current = true;
  }, [
    enablePinchZoom,
    centerX,
    contentScrollY,
    contentHeight,
    baseSize.w,
    baseSize.h,
  ]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    function measure() {
      const node = contentRef.current;
      if (!node) return;
      setBaseSize({ w: node.offsetWidth, h: node.offsetHeight });
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
    if (enablePinchZoom) return;
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

      if (scrollUserAdjustedRef.current || scrollHasAutoCenteredRef.current) {
        clampScroll(node);
        return;
      }

      const inner = node.firstElementChild as HTMLElement | null;
      const contentWidth = inner?.scrollWidth ?? inner?.offsetWidth ?? 0;
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
      scrollHasAutoCenteredRef.current = true;
    }

    applyAutoScroll();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(applyAutoScroll);
    });
    ro.observe(el);
    const outerContent = el.firstElementChild;
    if (outerContent) ro.observe(outerContent);
    return () => ro.disconnect();
  }, [centerX, contentHeight, contentScrollY, enablePinchZoom]);

  function cancelPan() {
    const el = ref.current;
    const pan = enablePinchZoom ? panRef.current : scrollPanRef.current;
    if (el && pan.active && pan.pointerId >= 0 && el.hasPointerCapture(pan.pointerId)) {
      el.releasePointerCapture(pan.pointerId);
    }
    if (enablePinchZoom) {
      panRef.current.active = false;
    } else {
      scrollPanRef.current.active = false;
    }
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
        startScale: viewRef.current.scale,
      };
      userAdjustedRef.current = true;
      return;
    }

    if (pointersRef.current.size > 1) return;

    if (enablePinchZoom) {
      panRef.current = {
        active: true,
        moved: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        viewX: viewRef.current.x,
        viewY: viewRef.current.y,
      };
    } else {
      scrollPanRef.current = {
        active: true,
        moved: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        scrollLeft: el.scrollLeft,
        scrollTop: el.scrollTop,
      };
    }
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
      if (pinchRef.current.startDistance <= 0 || distance <= 0 || baseSize.w <= 0) return;

      const center = pointerCenter(pointersRef.current);
      const rect = el.getBoundingClientRect();
      const fx = center.x - rect.left;
      const fy = center.y - rect.top;
      const nextScale =
        pinchRef.current.startScale * (distance / pinchRef.current.startDistance);

      const next = zoomAtFocal(
        fx,
        fy,
        viewRef.current,
        nextScale,
        el.clientWidth,
        el.clientHeight,
        baseSize.w,
        baseSize.h,
      );
      if (next.scale !== viewRef.current.scale || next.x !== viewRef.current.x) {
        setViewSafe(next);
      }
      return;
    }

    if (enablePinchZoom) {
      const pan = panRef.current;
      if (!pan.active || pan.pointerId !== event.pointerId) return;

      const dx = event.clientX - pan.startX;
      const dy = event.clientY - pan.startY;
      if (!pan.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

      pan.moved = true;
      userAdjustedRef.current = true;
      const next = clampViewport(
        pan.viewX + dx,
        pan.viewY + dy,
        viewRef.current.scale,
        el.clientWidth,
        el.clientHeight,
        baseSize.w,
        baseSize.h,
      );
      setViewSafe(next);
      return;
    }

    const pan = scrollPanRef.current;
    if (!pan.active || pan.pointerId !== event.pointerId) return;

    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (!pan.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;

    pan.moved = true;
    scrollUserAdjustedRef.current = true;
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

    const pan = enablePinchZoom ? panRef.current : scrollPanRef.current;
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

    pan.active = false;
  }

  if (enablePinchZoom) {
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-full w-full max-w-full min-w-0 touch-none overflow-hidden",
          "cursor-grab select-none active:cursor-grabbing",
          className,
        )}
        onPointerDownCapture={onPointerDown}
        onPointerMoveCapture={onPointerMove}
        onPointerUpCapture={endPan}
        onPointerCancelCapture={endPan}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 w-max origin-top-left will-change-transform"
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
        >
          {children}
        </div>
      </div>
    );
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
      <div ref={contentRef} className="mx-auto w-max text-left">
        {children}
      </div>
    </div>
  );
}
