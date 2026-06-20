import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RulesGamePage } from "@/components/site/rules-game-page";
import {
  getAllBilliardGameParams,
  getBilliardGame,
} from "@/lib/billiard-rules";
import { rulesGameMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ tableSlug: string; gameSlug: string }>;
};

export function generateStaticParams() {
  return getAllBilliardGameParams().map(({ tableSlug, gameSlug }) => ({
    tableSlug,
    gameSlug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tableSlug, gameSlug } = await params;
  const found = getBilliardGame(tableSlug, gameSlug);
  if (!found) return { title: "Игра не найдена" };
  return rulesGameMetadata(found.table, found.game);
}

export default async function RulesGameRoute({ params }: PageProps) {
  const { tableSlug, gameSlug } = await params;
  const found = getBilliardGame(tableSlug, gameSlug);
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
