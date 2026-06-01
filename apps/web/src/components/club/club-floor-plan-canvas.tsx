"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  floorAmenityIcon,
  floorItemLabel,
  floorPlanContentBounds,
  floorPlanItemPosition,
  floorTableColor,
  floorTableDisplayPrice,
  type FloorPlanItem,
} from "@/lib/club-floor-plan";
import type { PriceTier } from "@/lib/club-schedule";
import type { ClubTableFormatId } from "@/lib/club-table-formats";
import type { FloorTableStatus } from "@/lib/floor-plan-booking";
import { cn } from "@/lib/cn";

type DragState = {
  id: string;
  pointerId: number;
};

export function ClubFloorPlanCanvas({
  items,
  editable = false,
  booking = false,
  bookingTableFormat,
  selectedId,
  tableStates,
  onSelect,
  onMove,
  onPlace,
  onTableClick,
  priceTiers,
  priceAt,
}: {
  items: FloorPlanItem[];
  editable?: boolean;
  booking?: boolean;
  bookingTableFormat?: ClubTableFormatId;
  selectedId?: string | null;
  tableStates?: Record<string, FloorTableStatus>;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onPlace?: (x: number, y: number) => void;
  onTableClick?: (id: string) => void;
  priceTiers?: PriceTier[];
  priceAt?: Date;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const priceNow = priceAt ?? new Date();
  const fitBounds = useMemo(
    () => (booking ? floorPlanContentBounds(items, 5) : null),
    [booking, items],
  );

  const positionFromEvent = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  function handlePointerDown(item: FloorPlanItem, pointerId: number) {
    if (!editable) return;
    onSelect?.(item.id);
    setDragging({ id: item.id, pointerId });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || dragging.pointerId !== e.pointerId || !onMove) return;
    const pos = positionFromEvent(e.clientX, e.clientY);
    if (!pos) return;
    onMove(dragging.id, pos.x, pos.y);
  }

  function finishDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (dragging?.pointerId === e.pointerId) setDragging(null);
  }

  return (
    <div
      ref={canvasRef}
      className={cn(
        "club-floor-plan-canvas",
        editable && "club-floor-plan-canvas--editable",
        booking && "club-floor-plan-canvas--booking",
      )}
      style={
        fitBounds
          ? { aspectRatio: `${fitBounds.spanX} / ${fitBounds.spanY}` }
          : undefined
      }
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClick={(e) => {
        if (!editable || e.target !== e.currentTarget) return;
        const pos = positionFromEvent(e.clientX, e.clientY);
        if (!pos) return;
        if (onPlace) {
          onPlace(pos.x, pos.y);
          return;
        }
        onSelect?.(null);
      }}
    >
      {items.map((item) => {
        const isTable = item.kind === "table" && item.tableFormat;
        const selected = selectedId === item.id;
        const label = floorItemLabel(item);
        const priceHint = priceTiers ? floorTableDisplayPrice(item, priceTiers, priceNow) : null;
        const tableStatus = isTable ? tableStates?.[item.id] : undefined;
        const isBookableFormat =
          !bookingTableFormat || item.tableFormat === bookingTableFormat;
        const isFree = !tableStatus || tableStatus === "free";
        const clickable =
          booking && isTable && isBookableFormat && isFree && !editable;

        const pos = fitBounds
          ? floorPlanItemPosition(item, fitBounds)
          : { left: item.x, top: item.y };

        return (
          <button
            key={item.id}
            type="button"
            title={priceHint ? `${label} · ${priceHint}` : label}
            disabled={booking && isTable && (!isBookableFormat || !isFree)}
            className={cn(
              "club-floor-plan-item",
              isTable ? "club-floor-plan-item--table" : "club-floor-plan-item--amenity",
              selected && "club-floor-plan-item--selected",
              dragging?.id === item.id && "club-floor-plan-item--dragging",
              tableStatus === "pending" && "club-floor-plan-item--pending",
              tableStatus === "confirmed" && "club-floor-plan-item--occupied",
              booking && isTable && !isBookableFormat && "club-floor-plan-item--context",
              booking && isTable && isBookableFormat && !isFree && "club-floor-plan-item--disabled",
              clickable && "club-floor-plan-item--pickable",
            )}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              ...(isTable && item.tableFormat
                ? { "--floor-item-color": floorTableColor(item.tableFormat) }
                : undefined),
            }}
            onClick={(e) => {
              if (!clickable) return;
              e.stopPropagation();
              onTableClick?.(item.id);
            }}
            onPointerDown={(e) => {
              if (!editable) return;
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              handlePointerDown(item, e.pointerId);
            }}
          >
            {isTable ? (
              <>
                <span className="club-floor-plan-item-table-surface" aria-hidden />
                <span className="club-floor-plan-item-label">{label}</span>
                {priceHint && (
                  <span className="club-floor-plan-item-price">{priceHint}</span>
                )}
              </>
            ) : (
              <>
                <span className="club-floor-plan-item-icon" aria-hidden>
                  {floorAmenityIcon(item.kind as never)}
                </span>
                <span className="club-floor-plan-item-label">{label}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
