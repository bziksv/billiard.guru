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
