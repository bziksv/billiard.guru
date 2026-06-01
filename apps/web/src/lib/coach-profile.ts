import { parseClubGalleryUrls } from "@/lib/club-photos";

export function parseCoachGalleryUrls(value: unknown): string[] {
  return parseClubGalleryUrls(value);
}

export function coachCoverPhoto(player: {
  photoUrl: string | null;
  coachGalleryUrls?: unknown;
}): string | null {
  const gallery = parseCoachGalleryUrls(player.coachGalleryUrls);
  if (gallery.length > 0) return gallery[0]!;
  return player.photoUrl;
}

export function coachTeaser(bio: string | null | undefined, max = 160): string {
  if (!bio?.trim()) return "Тренер по бильярду — подробности в профиле.";
  const text = bio.trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}
