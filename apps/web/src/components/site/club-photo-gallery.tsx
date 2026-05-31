"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function ClubPhotoGallery({
  photos,
  alt,
  className,
}: {
  photos: string[];
  alt: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const hasMany = count > 1;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex((next + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (!hasMany) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") goTo(index - 1);
      if (event.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, hasMany, index]);

  if (count === 0) {
    return (
      <div className={cn("site-club-photo-placeholder aspect-[16/10] w-full", className)}>
        🎱
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/club-gallery relative aspect-[16/10] w-full overflow-hidden bg-[var(--bg-muted)]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt={alt}
        className="h-full w-full object-cover"
      />

      {hasMany && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="club-gallery-nav club-gallery-nav--prev"
            aria-label="Предыдущее фото"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="club-gallery-nav club-gallery-nav--next"
            aria-label="Следующее фото"
          >
            ›
          </button>

          <div className="club-gallery-dots" role="tablist" aria-label="Фото клуба">
            {photos.map((photo, i) => (
              <button
                key={photo}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Фото ${i + 1} из ${count}`}
                onClick={() => setIndex(i)}
                className={cn("club-gallery-dot", i === index && "club-gallery-dot--active")}
              />
            ))}
          </div>

          <span className="club-gallery-counter" aria-hidden="true">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}
