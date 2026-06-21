import type { BracketCardDisplayPrefs } from "@/lib/bracket-display-prefs";

type DisplayLabels = {
  match: string;
  matchTitle: string;
  handicap: string;
  placement: string;
  placementTitle: string;
};

const ADMIN_LABELS: DisplayLabels = {
  match: "Встреча",
  matchTitle: "Шапка карточки: номер встречи (№…)",
  handicap: "Фора",
  placement: "Места",
  placementTitle: "Подвал карточки: места и переходы (победитель/проигравший на #…)",
};

type Props = BracketCardDisplayPrefs & {
  variant?: "admin" | "site";
  displayLabels?: DisplayLabels;
  onShowMatchNumberChange: (value: boolean) => void;
  onShowHandicapChange: (value: boolean) => void;
  onShowPlacementChange: (value: boolean) => void;
};

export function BracketCardDisplayToggles({
  variant = "admin",
  displayLabels,
  showMatchNumber,
  showHandicap,
  showPlacement,
  onShowMatchNumberChange,
  onShowHandicapChange,
  onShowPlacementChange,
}: Props) {
  const labels = variant === "site" && displayLabels ? displayLabels : ADMIN_LABELS;
  const checkboxClass = variant === "admin" ? "admin-checkbox" : "rounded border-[var(--border-subtle)]";
  const wrapClass =
    variant === "admin"
      ? "flex shrink-0 items-center gap-2 border-l border-[var(--admin-border)] pl-2 text-xs text-[var(--admin-text-muted)]"
      : "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]";

  return (
    <div className={wrapClass}>
      <label
        className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap"
        title={labels.matchTitle}
      >
        <input
          type="checkbox"
          className={checkboxClass}
          checked={showMatchNumber}
          onChange={(e) => onShowMatchNumberChange(e.target.checked)}
        />
        {labels.match}
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap">
        <input
          type="checkbox"
          className={checkboxClass}
          checked={showHandicap}
          onChange={(e) => onShowHandicapChange(e.target.checked)}
        />
        {labels.handicap}
      </label>
      <label
        className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap"
        title={labels.placementTitle}
      >
        <input
          type="checkbox"
          className={checkboxClass}
          checked={showPlacement}
          onChange={(e) => onShowPlacementChange(e.target.checked)}
        />
        {labels.placement}
      </label>
    </div>
  );
}
