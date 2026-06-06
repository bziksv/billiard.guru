import { BracketsIndexPage } from "@/components/site/brackets-index-page";
import { getPublicEnabledBracketFormats } from "@/lib/bracket-formats/public-formats";

export const metadata = {
  title: "Турнирные сетки — форматы и демо-схемы",
  description:
    "Турнирные сетки на billiard.guru: олимпийская, швейцарская, сетки на 16, 32 и 64 человек. Интерактивные демо и создание турнира онлайн.",
};

export const revalidate = 3600;

export default async function TournamentBracketsPage() {
  const enabledFormats = await getPublicEnabledBracketFormats();

  return <BracketsIndexPage enabledFormats={enabledFormats} />;
}
