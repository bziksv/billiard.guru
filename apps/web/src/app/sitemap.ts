import type { MetadataRoute } from "next";
import {
  getAllBilliardGameParams,
  getAllBilliardTableSlugs,
} from "@/lib/billiard-rules/get-rules-content";
import { getAllBracketFormatSeoSlugs } from "@/lib/bracket-formats/seo";
import { getAllLegalDocSlugs } from "@/lib/legal-content";
import { isEnContentReady } from "@/i18n/en-ready-paths";
import { getSitemapDynamicUrls } from "@/lib/sitemap-urls-server";
import { SEO_SITE_URL, STATIC_PAGE_SEO } from "@/lib/seo";

function siteUrl(path: string): string {
  return `${SEO_SITE_URL}${path === "/" ? "" : path}`;
}

function enPath(path: string): string {
  return path === "/" ? "/en" : `/en${path}`;
}

function withAlternates(path: string): MetadataRoute.Sitemap[number]["alternates"] {
  if (!isEnContentReady(path)) return undefined;
  return {
    languages: {
      ru: siteUrl(path),
      en: siteUrl(enPath(path)),
      "x-default": siteUrl(path),
    },
  };
}

function pushEntry(
  entries: MetadataRoute.Sitemap,
  path: string,
  lastModified: Date,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
) {
  entries.push({
    url: siteUrl(path),
    lastModified,
    changeFrequency,
    priority,
    alternates: withAlternates(path),
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  for (const seo of Object.values(STATIC_PAGE_SEO)) {
    if ("noindex" in seo && seo.noindex) continue;
    const path = seo.path ?? "/";
    pushEntry(
      entries,
      path,
      now,
      path === "/" ? 1 : 0.8,
      path === "/" ? "daily" : "weekly",
    );
  }

  for (const tableSlug of getAllBilliardTableSlugs("ru")) {
    pushEntry(entries, `/rules/${tableSlug}`, now, 0.7, "monthly");
  }

  for (const { tableSlug, gameSlug } of getAllBilliardGameParams("ru")) {
    pushEntry(entries, `/rules/${tableSlug}/${gameSlug}`, now, 0.65, "monthly");
  }

  for (const slug of getAllBracketFormatSeoSlugs()) {
    pushEntry(entries, `/brackets/${slug}`, now, 0.7, "monthly");
  }

  for (const doc of getAllLegalDocSlugs()) {
    pushEntry(entries, `/legal/${doc}`, now, 0.3, "yearly");
  }

  const dynamic = await getSitemapDynamicUrls();
  for (const { path, lastModified } of dynamic) {
    pushEntry(entries, path, lastModified, 0.6, "weekly");
  }

  return entries;
}
