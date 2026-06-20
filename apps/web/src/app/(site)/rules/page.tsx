import Link from "next/link";
import { GuideSections, GuideToc } from "@/components/site/guide-sections";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { BILLIARD_RULES_SECTIONS } from "@/lib/guide-content";
import { buildPageMetadata, STATIC_PAGE_SEO } from "@/lib/seo";

export const metadata = buildPageMetadata(STATIC_PAGE_SEO.rules);

export default function BilliardRulesPage() {
  return (
    <>
      <PageHeader
        title="Правила бильярда"
        lead="Краткий справочник для игроков и организаторов. Точный регламент конкретного турнира всегда важнее общих правил."
      >
        <Link href="/brackets" className="site-btn-secondary shrink-0">
          Турнирные сетки →
        </Link>
      </PageHeader>
      <PageMain className="grid gap-8 pt-0 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <GuideToc sections={BILLIARD_RULES_SECTIONS} />
          </div>
        </aside>
        <GuideSections sections={BILLIARD_RULES_SECTIONS} />
      </PageMain>
    </>
  );
}
