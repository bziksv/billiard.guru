const EARTH_RADIUS_KM = 6371;

export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export interface CityCoords {
  id: string;
  latitude: number | null;
  longitude: number | null;
}

export function getNearbyCityIds(
  origin: CityCoords,
  cities: CityCoords[],
  radiusKm: number,
): string[] {
  const originLat = origin.latitude;
  const originLng = origin.longitude;
  if (originLat == null || originLng == null) {
    return [origin.id];
  }

  return cities
    .filter((city) => {
      if (city.latitude == null || city.longitude == null) {
        return city.id === origin.id;
      }
      return (
        distanceKm(originLat, originLng, city.latitude, city.longitude) <=
        radiusKm
      );
    })
    .map((city) => city.id);
}

export const NOTIFY_RADIUS_KM = 150;
