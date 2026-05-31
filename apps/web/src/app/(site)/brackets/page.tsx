import Link from "next/link";
import { GuideSections, GuideToc } from "@/components/site/guide-sections";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { TOURNAMENT_BRACKETS_SECTIONS } from "@/lib/tournament-brackets-guide";

export const metadata = {
  title: "Турнирные сетки",
  description: "Олимпийская, швейцарская и фиксированная сетка на billiard.guru.",
};

export default function TournamentBracketsPage() {
  return (
    <>
      <PageHeader
        title="Турнирные сетки"
        lead="Как устроены форматы турниров на платформе: олимпийская, швейцарская по турам и фиксированная сетка — с примерами и таблицами."
      >
        <Link href="/tournaments" className="site-btn-primary shrink-0">
          Смотреть турниры
        </Link>
      </PageHeader>
      <PageMain className="grid gap-8 pt-0 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <GuideToc sections={TOURNAMENT_BRACKETS_SECTIONS} />
          </div>
        </aside>
        <GuideSections sections={TOURNAMENT_BRACKETS_SECTIONS} />
      </PageMain>
    </>
  );
}
