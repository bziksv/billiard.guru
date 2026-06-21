import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BracketFormatDemoPreview } from "@/components/site/bracket-format-demo-preview";
import { GuideExampleBlock } from "@/components/site/guide-sections";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import {
  buildBracketFormatDemo,
  isLargeBracketDemo,
} from "@/lib/bracket-formats/demo-bracket";
import {
  bracketFormatCardTitle,
  bracketFormatParticipantBadge,
  bracketIndexTeaser,
  getBracketsIndexContent,
} from "@/lib/bracket-formats/get-brackets-index-content";
import {
  getLocalizedBracketAdminLabel,
  getLocalizedBracketGuideSection,
  getLocalizedBracketShortDescription,
  localizeParticipantRules,
  localizedBracketSeoEntry,
} from "@/lib/bracket-formats/get-bracket-format-display";
import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";
import { bracketFormatDisplayLabel } from "@/lib/bracket-formats/seo";
import { TOURNAMENT_BRACKETS_SECTIONS } from "@/lib/tournament-brackets-guide";
import type { AppLocale } from "@/i18n/routing";

export async function BracketFormatLanding({
  format,
  relatedFormats,
}: {
  format: PublicBracketFormat;
  relatedFormats: PublicBracketFormat[];
}) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("brackets.landing");
  const { platformFeatures } = getBracketsIndexContent(locale);

  const { definition } = format;
  const seo = localizedBracketSeoEntry(locale, format.seo);
  const participantRules = localizeParticipantRules(locale, format.participantRules);
  const guideSection =
    getLocalizedBracketGuideSection(locale, definition.guideSectionId) ?? format.guideSection;
  const adminLabel = getLocalizedBracketAdminLabel(
    locale,
    definition.code,
    bracketFormatDisplayLabel(definition.code),
  );
  const shortDescription = getLocalizedBracketShortDescription(
    locale,
    definition.code,
    definition.shortDescription,
  );

  const demoMatches = buildBracketFormatDemo(definition.code, definition.pairing, locale);
  const structureDiagram =
    guideSection?.examples?.find((e) => e.diagram)?.diagram ??
    TOURNAMENT_BRACKETS_SECTIONS.find(
      (s) =>
        s.format === definition.code ||
        s.id === definition.guideSectionId?.replace(/-bronze$/, ""),
    )?.examples?.find((e) => e.diagram)?.diagram ??
    null;
  const compactDemoMatches = isLargeBracketDemo(demoMatches)
    ? buildBracketFormatDemo("FIXED_SWISS_32R8_2_3_mesta", definition.pairing, locale)
    : null;
  const compactDemoFormat = "FIXED_SWISS_32R8_2_3_mesta";

  return (
    <>
      <PageHeader title={seo.pageTitle} lead={seo.lead}>
        <div className="flex flex-wrap gap-3">
          <Link href="/login?next=/cabinet" className="site-btn-primary shrink-0">
            {t("create")}
          </Link>
          <Link href="/tournaments" className="site-btn-secondary shrink-0">
            {t("tournaments")}
          </Link>
        </div>
      </PageHeader>

      <PageMain className="space-y-8 pt-0">
        <div className="flex flex-wrap gap-2">
          <span className="bracket-format-chip">{seo.participantBadge}</span>
          <span className="bracket-format-chip bracket-format-chip-muted">
            {definition.pairing === "pair" ? t("pairEvent") : t("singleEvent")}
          </span>
          <span className="bracket-format-chip bracket-format-chip-muted">{adminLabel}</span>
        </div>

        <SiteCard className="bracket-format-demo-card">
          <h2 className="site-section-title text-xl">{t("diagramTitle")}</h2>
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
            <h2 className="site-section-title text-xl">{t("aboutTitle")}</h2>
            <p className="guide-body-text mt-3 text-sm leading-relaxed">{shortDescription}</p>
            <p className="guide-body-text mt-3 text-sm leading-relaxed">
              {t("participants")}: {participantRules.label}. {participantRules.hint}
            </p>
          </SiteCard>
        )}

        <SiteCard className="bracket-format-cta">
          <div className="bracket-format-cta-inner">
            <div>
              <h2 className="site-section-title text-xl">{t("ctaTitle")}</h2>
              <p className="guide-body-text mt-2 max-w-2xl text-sm leading-relaxed">
                {t("ctaLead", { format: adminLabel })}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/login?next=/cabinet" className="site-btn-primary">
                {t("ctaRegister")}
              </Link>
              <Link href="/brackets" className="site-btn-secondary">
                {t("ctaAllFormats")}
              </Link>
            </div>
          </div>
        </SiteCard>

        <section>
          <h2 className="site-section-title mb-4 text-xl">{t("platformTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platformFeatures.map((feature) => (
              <SiteCard key={feature.title} className="h-full">
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="guide-body-text mt-2 text-sm leading-relaxed">{feature.text}</p>
              </SiteCard>
            ))}
          </div>
        </section>

        {relatedFormats.length > 0 && (
          <section>
            <h2 className="site-section-title mb-4 text-xl">{t("relatedTitle")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relatedFormats.map((related) => (
                <Link
                  key={related.definition.code}
                  href={`/brackets/${related.seo.slug}`}
                  className="bracket-format-card-link"
                >
                  <SiteCard className="h-full transition-colors hover:border-emerald-700/50">
                    <span className="bracket-format-chip text-xs">
                      {bracketFormatParticipantBadge(locale, related)}
                    </span>
                    <h3 className="mt-3 font-semibold leading-snug">
                      {bracketFormatCardTitle(locale, related)}
                    </h3>
                    <p className="guide-body-text mt-2 line-clamp-2 text-sm">
                      {locale === "en"
                        ? bracketIndexTeaser(locale, related)
                        : related.definition.shortDescription}
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
