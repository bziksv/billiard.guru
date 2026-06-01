import { geocodeClubAddress } from "@/lib/geocode";
import { prisma } from "@/lib/prisma";

export async function resolveClubCoordinates(
  address: string | null | undefined,
  cityId: string,
): Promise<{ latitude: number | null; longitude: number | null }> {
  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: { country: true },
  });
  if (!city) {
    return { latitude: null, longitude: null };
  }

  if (!address?.trim()) {
    return {
      latitude: city.latitude ?? null,
      longitude: city.longitude ?? null,
    };
  }

  const coords = await geocodeClubAddress(address, city.nameRu, city.country.nameRu);
  if (coords) return coords;

  return {
    latitude: city.latitude ?? null,
    longitude: city.longitude ?? null,
  };
}

export async function clubCoordsIfAddressChanged(
  existing: { address: string | null; cityId: string; latitude: number | null; longitude: number | null },
  next: { address?: string | null; cityId?: string },
): Promise<{ latitude: number | null; longitude: number | null } | undefined> {
  const addressChanged =
    next.address !== undefined && (next.address ?? "") !== (existing.address ?? "");
  const cityChanged = next.cityId !== undefined && next.cityId !== existing.cityId;

  if (!addressChanged && !cityChanged) {
    return undefined;
  }

  const address = next.address !== undefined ? next.address : existing.address;
  const cityId = next.cityId !== undefined ? next.cityId : existing.cityId;
  return resolveClubCoordinates(address, cityId);
}
