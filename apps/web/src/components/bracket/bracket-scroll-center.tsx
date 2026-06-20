"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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

/** Сохраняет точку под центром pinch при смене масштаба. */
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
  el.scrollLeft = focalX + ratio * (el.scrollLeft - focalX);
  el.scrollTop = focalY + ratio * (el.scrollTop - focalY);
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
  /** Для высоких fixed-сеток — начальная прокрутка по вертикали. */
  contentHeight?: number;
  contentScrollY?: "center" | "start";
  /** Два пальца — масштаб сетки (полноэкранный режим). */
  enablePinchZoom?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef({ active: false, startDistance: 0, startScale: 1 });
  const scaleRef = useRef(1);
  const [scale, setScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  scaleRef.current = scale;

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
      setNaturalSize({ w: node.offsetWidth, h: node.offsetHeight });
    }

    measure();
    const ro = new ResizeObserver(() => {
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
      node.scrollLeft = Math.min(node.scrollLeft, maxScrollLeft);
      node.scrollLeft = Math.max(0, node.scrollLeft);

      const maxScrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
      node.scrollTop = Math.min(node.scrollTop, maxScrollTop);
      node.scrollTop = Math.max(0, node.scrollTop);
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
        ? naturalSize.w * currentScale
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
        ? naturalSize.h * currentScale
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
  }, [centerX, contentHeight, contentScrollY, enablePinchZoom, naturalSize.h, naturalSize.w]);

  function applyScale(el: HTMLDivElement, nextScale: number, focal?: { x: number; y: number }) {
    const prevScale = scaleRef.current;
    const clamped = clampPinchScale(nextScale);
    if (clamped === prevScale) return;

    const center = focal ?? pointerCenter(pointersRef.current);
    zoomScrollToFocal(el, prevScale, clamped, center.x, center.y);
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
        const next = pinchRef.current.startScale * (distance / pinchRef.current.startDistance);
        applyScale(el, next);
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

  const contentNode = (
    <div ref={contentRef} className="w-max text-left">
      {children}
    </div>
  );

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
          className="relative"
          style={{
            width: naturalSize.w > 0 ? naturalSize.w * scale : undefined,
            height: naturalSize.h > 0 ? naturalSize.h * scale : undefined,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: naturalSize.w > 0 ? naturalSize.w : undefined,
              height: naturalSize.h > 0 ? naturalSize.h : undefined,
            }}
          >
            {contentNode}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-max text-left">{children}</div>
      )}
    </div>
  );
}
