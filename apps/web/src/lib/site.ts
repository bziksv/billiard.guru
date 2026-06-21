/** CTA-кнопка в шапке — «Покатать». */
export const SITE_NAV_CTA = { href: "/pokatat", labelKey: "nav.pokatat" as const };

/** Основная навигация в шапке. */
export const SITE_NAV_MAIN = [
  { href: "/", labelKey: "nav.home" as const },
  { href: "/tournaments", labelKey: "nav.tournaments" as const },
  { href: "/clubs", labelKey: "nav.clubs" as const },
  { href: "/players", labelKey: "nav.players" as const },
  { href: "/coaches", labelKey: "nav.coaches" as const },
  { href: "/ideas", labelKey: "nav.ideas" as const },
] as const;

/** Справочник — выпадающее меню в шапке. */
export const SITE_GUIDE_NAV = [
  { href: "/rules", labelKey: "nav.rules" as const },
  { href: "/brackets", labelKey: "nav.brackets" as const },
] as const;

/** Все разделы — для подвала и прочих списков. */
export const SITE_NAV = [...SITE_NAV_MAIN, SITE_NAV_CTA, ...SITE_GUIDE_NAV] as const;

export type SiteLabelKey =
  | (typeof SITE_NAV)[number]["labelKey"]
  | "nav.guide"
  | "nav.login"
  | "nav.logout"
  | "nav.cabinet"
  | "nav.admin"
  | "footer.tagline"
  | "geo.all"
  | "geo.country"
  | "geo.city"
  | "geo.region"
  | "home.hero.title"
  | "home.hero.subtitle"
  | "home.local"
  | "home.upcoming"
  | "home.explore"
  | "empty.tournaments"
  | "empty.clubs"
  | "empty.players"
  | "empty.coaches"
  | "empty.pokatat";

export type GeoSearchParams = {
  countryId?: string;
  cityId?: string;
};

export function geoQueryString(params: GeoSearchParams): string {
  const q = new URLSearchParams();
  if (params.countryId) q.set("countryId", params.countryId);
  if (params.cityId) q.set("cityId", params.cityId);
  const s = q.toString();
  return s ? `?${s}` : "";
}

export function hrefWithGeo(path: string, params: GeoSearchParams): string {
  return `${path}${geoQueryString(params)}`;
}
