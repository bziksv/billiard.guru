"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClubFloorPlanCanvas } from "@/components/club/club-floor-plan-canvas";
import {
  floorAmenityIcon,
  floorItemLabel,
  parseFloorPlan,
} from "@/lib/club-floor-plan";
import type { FloorTableStatus } from "@/lib/floor-plan-booking";
import { parsePriceTiers } from "@/lib/club-schedule";

type OccupancyRow = {
  id: string;
  status: FloorTableStatus;
};

export function ClubFloorPlanLive({
  clubId,
  floorPlan,
  priceTiers: priceTiersRaw,
}: {
  clubId: string;
  floorPlan: unknown;
  priceTiers?: unknown;
}) {
  const plan = useMemo(() => parseFloorPlan(floorPlan), [floorPlan]);
  const priceTiers = useMemo(() => parsePriceTiers(priceTiersRaw), [priceTiersRaw]);
  const [tableStates, setTableStates] = useState<Record<string, FloorTableStatus>>({});
  const [priceAt, setPriceAt] = useState(() => new Date());

  const loadOccupancy = useCallback(async () => {
    setPriceAt(new Date());
    const res = await fetch(
      `/api/clubs/${clubId}/bookings?floor=1&at=${encodeURIComponent(new Date().toISOString())}`,
    );
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.tables)) return;
    const next: Record<string, FloorTableStatus> = {};
    for (const row of data.tables as OccupancyRow[]) {
      next[row.id] = row.status;
    }
    setTableStates(next);
  }, [clubId]);

  useEffect(() => {
    void loadOccupancy();
    const timer = window.setInterval(() => void loadOccupancy(), 60_000);
    return () => window.clearInterval(timer);
  }, [loadOccupancy]);

  if (!plan || plan.items.length === 0) return null;

  const amenities = plan.items.filter((item) => item.kind !== "table");
  const hasOccupancy = Object.values(tableStates).some((s) => s !== "free");

  return (
    <div className="club-floor-plan-view space-y-4">
      <ClubFloorPlanCanvas
        items={plan.items}
        tableStates={tableStates}
        priceTiers={priceTiers}
        priceAt={priceAt}
      />
      <ul className="club-floor-plan-legend">
        {hasOccupancy && (
          <>
            <li className="club-floor-plan-legend-item">
              <span className="club-floor-plan-legend-dot club-floor-plan-legend-dot--free" />
              <span>Свободен</span>
            </li>
            <li className="club-floor-plan-legend-item">
              <span className="club-floor-plan-legend-dot club-floor-plan-legend-dot--pending" />
              <span>Ожидает подтверждения</span>
            </li>
            <li className="club-floor-plan-legend-item">
              <span className="club-floor-plan-legend-dot club-floor-plan-legend-dot--occupied" />
              <span>Занят</span>
            </li>
          </>
        )}
        {amenities.map((item) => (
          <li key={item.id} className="club-floor-plan-legend-item">
            <span className="club-floor-plan-legend-icon">{floorAmenityIcon(item.kind as never)}</span>
            <span>{floorItemLabel(item)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
