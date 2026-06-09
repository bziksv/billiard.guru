import Link from "next/link";
import { BracketFormatDemoPreview } from "@/components/site/bracket-format-demo-preview";
import { GuideExampleBlock } from "@/components/site/guide-sections";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import {
  buildBracketFormatDemo,
  isLargeBracketDemo,
} from "@/lib/bracket-formats/demo-bracket";
import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";
import {
  BRACKET_PLATFORM_FEATURES,
  bracketFormatDisplayLabel,
} from "@/lib/bracket-formats/seo";
import { TOURNAMENT_BRACKETS_SECTIONS } from "@/lib/tournament-brackets-guide";

export function BracketFormatLanding({
  format,
  relatedFormats,
}: {
  format: PublicBracketFormat;
  relatedFormats: PublicBracketFormat[];
}) {
  const { definition, seo, participantRules, guideSection } = format;
  const demoMatches = buildBracketFormatDemo(definition.code, definition.pairing);
  const structureDiagram =
    guideSection?.examples?.find((e) => e.diagram)?.diagram ??
    TOURNAMENT_BRACKETS_SECTIONS.find(
      (s) => s.format === definition.code || s.id === definition.guideSectionId?.replace(/-bronze$/, ""),
    )?.examples?.find((e) => e.diagram)?.diagram ??
    null;
  const compactDemoMatches =
    isLargeBracketDemo(demoMatches)
      ? buildBracketFormatDemo("FIXED_SWISS_32R8_2_3_mesta", definition.pairing)
      : null;
  const compactDemoFormat = "FIXED_SWISS_32R8_2_3_mesta";
  const adminLabel = bracketFormatDisplayLabel(definition.code);

  return (
    <>
      <PageHeader title={seo.pageTitle} lead={seo.lead}>
        <div className="flex flex-wrap gap-3">
          <Link href="/login?next=/cabinet" className="site-btn-primary shrink-0">
            Создать турнир
          </Link>
          <Link href="/tournaments" className="site-btn-secondary shrink-0">
            Смотреть турниры
          </Link>
        </div>
      </PageHeader>

      <PageMain className="space-y-8 pt-0">
        <div className="flex flex-wrap gap-2">
          <span className="bracket-format-chip">{seo.participantBadge}</span>
          <span className="bracket-format-chip bracket-format-chip-muted">
            {definition.pairing === "pair" ? "Парный турнир" : "Одиночный"}
          </span>
          <span className="bracket-format-chip bracket-format-chip-muted">{adminLabel}</span>
        </div>

        <SiteCard className="bracket-format-demo-card">
          <h2 className="site-section-title text-xl">Схема сетки</h2>
          <p className="guide-body-text mt-2 text-sm leading-relaxed">{seo.lead}</p>
          <div className="mt-5">
            <BracketFormatDemoPreview
              format={definition.code}
              matches={demoMatches}
              structureDiagram={structureDiagram}
              compactDemoMatches={compactDemoMatches}
              compactDemoFormat={compactDemoFormat}
            />
          </div>
        </SiteCard>

        {guideSection && (
          <SiteCard>
            <h2 className="site-section-title text-xl">{guideSection.title}</h2>
            {guideSection.paragraphs?.map((text) => (
              <p key={text} className="guide-body-text mt-3 text-sm leading-relaxed">
                {text}
              </p>
            ))}
            {guideSection.bullets && guideSection.bullets.length > 0 && (
              <ul className="guide-body-text mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {guideSection.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {guideSection.examples?.map((example) => (
              <div key={example.title} className="mt-5">
                <GuideExampleBlock example={example} />
              </div>
            ))}
            {guideSection.note && (
              <p className="guide-note mt-4 text-sm">{guideSection.note}</p>
            )}
          </SiteCard>
        )}

        {!guideSection && (
          <SiteCard>
            <h2 className="site-section-title text-xl">О формате</h2>
            <p className="guide-body-text mt-3 text-sm leading-relaxed">
              {definition.shortDescription}
            </p>
            <p className="guide-body-text mt-3 text-sm leading-relaxed">
              Участников: {participantRules.label}. {participantRules.hint}
            </p>
          </SiteCard>
        )}

        <SiteCard className="bracket-format-cta">
          <div className="bracket-format-cta-inner">
            <div>
              <h2 className="site-section-title text-xl">Проведите турнир на billiard.guru</h2>
              <p className="guide-body-text mt-2 max-w-2xl text-sm leading-relaxed">
                Зарегистрируйтесь, создайте событие и выберите формат «{adminLabel}». Сетка
                сформируется автоматически — останется принимать заявки и вносить результаты.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/login?next=/cabinet" className="site-btn-primary">
                Регистрация бесплатно
              </Link>
              <Link href="/brackets" className="site-btn-secondary">
                Все форматы сеток
              </Link>
            </div>
          </div>
        </SiteCard>

        <section>
          <h2 className="site-section-title mb-4 text-xl">Возможности платформы</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BRACKET_PLATFORM_FEATURES.map((feature) => (
              <SiteCard key={feature.title} className="h-full">
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="guide-body-text mt-2 text-sm leading-relaxed">{feature.text}</p>
              </SiteCard>
            ))}
          </div>
        </section>

        {relatedFormats.length > 0 && (
          <section>
            <h2 className="site-section-title mb-4 text-xl">Другие форматы сеток</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedFormats.map((related) => (
                <Link
                  key={related.definition.code}
                  href={`/brackets/${related.seo.slug}`}
                  className="bracket-format-card-link"
                >
                  <SiteCard className="h-full transition-colors hover:border-emerald-700/50">
                    <span className="bracket-format-chip text-xs">
                      {related.seo.participantBadge}
                    </span>
                    <h3 className="mt-3 font-semibold leading-snug">{related.seo.pageTitle}</h3>
                    <p className="guide-body-text mt-2 line-clamp-2 text-sm">
                      {related.definition.shortDescription}
                    </p>
                  </SiteCard>
                </Link>
              ))}
            </div>
          </section>
        )}
      </PageMain>
    </>
  );
}
