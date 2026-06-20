import type { ClubTableFormatId } from "@/lib/club-table-formats";
import { rulesTableAccentColor } from "@/lib/billiard-rules";

export function RulesTableIcon({
  formatId,
  pockets,
  className = "",
}: {
  formatId: ClubTableFormatId;
  pockets: boolean;
  className?: string;
}) {
  const color = rulesTableAccentColor(formatId);

  return (
    <svg
      viewBox="0 0 120 64"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="4"
        y="8"
        width="112"
        height="48"
        rx="6"
        fill={`${color}22`}
        stroke={color}
        strokeWidth="2"
      />
      <line
        x1="60"
        y1="14"
        x2="60"
        y2="50"
        stroke={color}
        strokeWidth="1"
        strokeOpacity={pockets ? 0 : 0.35}
      />
      {pockets ? (
        <>
          {/* 4 угловые + 2 средние на длинных бортах (верх/низ) */}
          <circle cx="10" cy="14" r="3.5" fill="#09090b" stroke={color} strokeWidth="1.5" />
          <circle cx="110" cy="14" r="3.5" fill="#09090b" stroke={color} strokeWidth="1.5" />
          <circle cx="10" cy="50" r="3.5" fill="#09090b" stroke={color} strokeWidth="1.5" />
          <circle cx="110" cy="50" r="3.5" fill="#09090b" stroke={color} strokeWidth="1.5" />
          <circle cx="60" cy="12" r="3" fill="#09090b" stroke={color} strokeWidth="1.5" />
          <circle cx="60" cy="52" r="3" fill="#09090b" stroke={color} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <circle cx="60" cy="32" r="4" fill={color} fillOpacity="0.85" />
          <circle cx="44" cy="26" r="2.5" fill={color} fillOpacity="0.55" />
          <circle cx="52" cy="22" r="2.5" fill={color} fillOpacity="0.55" />
          <circle cx="68" cy="22" r="2.5" fill={color} fillOpacity="0.55" />
          <circle cx="76" cy="26" r="2.5" fill={color} fillOpacity="0.55" />
        </>
      )}
    </svg>
  );
}
