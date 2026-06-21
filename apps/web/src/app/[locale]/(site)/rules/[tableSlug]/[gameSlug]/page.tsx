import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RulesGamePage } from "@/components/site/rules-game-page";
import {
  getAllBilliardGameParams,
  getBilliardGame,
} from "@/lib/billiard-rules/get-rules-content";
import { buildLocalizedRulesGameMetadata } from "@/lib/seo-locale";
import type { AppLocale } from "@/i18n/routing";

type PageProps = {
  params: Promise<{ locale: string; tableSlug: string; gameSlug: string }>;
};

export function generateStaticParams() {
  const locales: AppLocale[] = ["ru", "en"];
  return locales.flatMap((locale) =>
    getAllBilliardGameParams(locale).map(({ tableSlug, gameSlug }) => ({
      locale,
      tableSlug,
      gameSlug,
    })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, tableSlug, gameSlug } = await params;
  const t = await getTranslations("rules.notFound");
  const found = getBilliardGame(locale as AppLocale, tableSlug, gameSlug);
  if (!found) return { title: t("game") };
  return buildLocalizedRulesGameMetadata(found.table, found.game, locale);
}

export default async function RulesGameRoute({ params }: PageProps) {
  const { locale, tableSlug, gameSlug } = await params;
  const found = getBilliardGame(locale as AppLocale, tableSlug, gameSlug);
  if (!found) notFound();

  const relatedGames = found.table.games.filter((g) => g.slug !== found.game.slug);

  return (
    <RulesGamePage
      table={found.table}
      game={found.game}
      relatedGames={relatedGames}
    />
  );
}
