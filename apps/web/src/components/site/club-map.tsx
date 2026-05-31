type ClubMapProps = {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  cityName?: string;
};

export function ClubMap({
  name,
  address,
  latitude,
  longitude,
  cityName,
}: ClubMapProps) {
  const lat = latitude ?? null;
  const lng = longitude ?? null;
  const hasCoords = lat != null && lng != null;

  if (!hasCoords && !address) {
    return (
      <p className="text-sm text-zinc-500">
        {cityName ? `Город: ${cityName}` : "Адрес уточняется у клуба."}
      </p>
    );
  }

  const label = [address, cityName].filter(Boolean).join(", ");
  const osmLink = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(label || name)}`;

  return (
    <div className="space-y-3">
      {label && <p className="text-sm text-zinc-300">{label}</p>}
      {hasCoords && (
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <iframe
            title={`Карта — ${name}`}
            className="h-64 w-full border-0 bg-zinc-900"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng! - 0.012}%2C${lat! - 0.008}%2C${lng! + 0.012}%2C${lat! + 0.008}&layer=mapnik&marker=${lat}%2C${lng}`}
          />
        </div>
      )}
      <a
        href={osmLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-emerald-400 hover:underline"
      >
        Открыть на карте →
      </a>
    </div>
  );
}
