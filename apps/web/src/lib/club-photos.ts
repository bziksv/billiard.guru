export function parseClubGalleryUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function clubPhotoUrls(club: {
  photoUrl: string | null;
  galleryUrls?: unknown;
}): string[] {
  const gallery = parseClubGalleryUrls(club.galleryUrls);
  if (gallery.length > 0) return gallery;
  return club.photoUrl ? [club.photoUrl] : [];
}

/** Список фото для редактирования в профиле клуба */
export function clubEditablePhotoUrls(club: {
  photoUrl: string | null;
  galleryUrls?: unknown;
}): string[] {
  return clubPhotoUrls(club);
}

export function syncClubPhotoFields(urls: string[]): {
  galleryUrls: string[] | null;
  photoUrl: string | null;
} {
  const clean = urls.map((u) => u.trim()).filter((u) => u.length > 0);
  if (clean.length === 0) {
    return { galleryUrls: null, photoUrl: null };
  }
  return { galleryUrls: clean, photoUrl: clean[0]! };
}
