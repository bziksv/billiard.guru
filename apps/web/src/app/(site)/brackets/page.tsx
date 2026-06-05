import Link from "next/link";
import { GuideSections, GuideToc } from "@/components/site/guide-sections";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { getPublicEnabledBracketFormats } from "@/lib/bracket-formats/public-formats";
import { TOURNAMENT_BRACKETS_SECTIONS } from "@/lib/tournament-brackets-guide";

export const metadata = {
  title: "Турнирные сетки — форматы и схемы",
  description:
    "Турнирные сетки и таблицы на billiard.guru: олимпийская, швейцарская, сетки на 16, 32 и 64 человек с демо-схемами и описанием.",
};

export const revalidate = 3600;

const STATIC_SECTION_IDS = new Set(["overview", "compare", "where", "pair-intro"]);

export default async function TournamentBracketsPage() {
  const enabledFormats = await getPublicEnabledBracketFormats();
  const enabledGuideIds = new Set(
    enabledFormats
      .map((f) => f.definition.guideSectionId)
      .filter((id): id is string => Boolean(id)),
  );

  const guideSections = TOURNAMENT_BRACKETS_SECTIONS.filter(
    (s) => STATIC_SECTION_IDS.has(s.id) || enabledGuideIds.has(s.id),
  );

  return (
    <>
      <PageHeader
        title="Турнирные сетки"
        lead="Форматы турниров на платформе: олимпийская, швейцарская и фиксированные сетки на 16, 32 и 64 участников — с демо-схемами и подробным описанием."
      >
        <Link href="/login?next=/cabinet" className="site-btn-primary shrink-0">
          Создать турнир
        </Link>
        <Link href="/tournaments" className="site-btn-secondary shrink-0">
          Смотреть турниры
        </Link>
      </PageHeader>

      <PageMain className="space-y-10 pt-0">
        {enabledFormats.length > 0 && (
          <section>
            <h2 className="site-section-title mb-2 text-xl">Доступные форматы</h2>
            <p className="guide-body-text mb-5 max-w-3xl text-sm leading-relaxed">
              Выберите формат — на отдельной странице интерактивная демо-схема, правила и
              возможности платформы. Подходит для запросов вроде «турнирная сетка на 16
              человек».
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enabledFormats.map((item) => (
                <Link
                  key={item.definition.code}
                  href={`/brackets/${item.seo.slug}`}
                  className="bracket-format-card-link"
                >
                  <SiteCard className="h-full transition-colors hover:border-emerald-700/50">
                    <span className="bracket-format-chip text-xs">
                      {item.seo.participantBadge}
                    </span>
                    <h3 className="mt-3 font-semibold leading-snug">{item.seo.pageTitle}</h3>
                    <p className="guide-body-text mt-2 line-clamp-3 text-sm">
                      {item.definition.shortDescription}
                    </p>
                    <span className="mt-4 inline-block text-sm font-medium text-emerald-400">
                      Смотреть схему →
                    </span>
                  </SiteCard>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <GuideToc sections={guideSections} />
            </div>
          </aside>
          <GuideSections sections={guideSections} />
        </div>
      </PageMain>
    </>
  );
}
