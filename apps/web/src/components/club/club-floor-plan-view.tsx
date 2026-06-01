import { ClubFloorPlanCanvas } from "@/components/club/club-floor-plan-canvas";
import { floorAmenityIcon, floorItemLabel, parseFloorPlan } from "@/lib/club-floor-plan";

export function ClubFloorPlanView({ floorPlan }: { floorPlan: unknown }) {
  const plan = parseFloorPlan(floorPlan);
  if (!plan || plan.items.length === 0) return null;

  const amenities = plan.items.filter((item) => item.kind !== "table");

  return (
    <div className="club-floor-plan-view space-y-4">
      <ClubFloorPlanCanvas items={plan.items} />
      {amenities.length > 0 && (
        <ul className="club-floor-plan-legend">
          {amenities.map((item) => (
            <li key={item.id} className="club-floor-plan-legend-item">
              <span className="club-floor-plan-legend-icon">{floorAmenityIcon(item.kind as never)}</span>
              <span>{floorItemLabel(item)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
