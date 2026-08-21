import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getAllLegalDocSlugs, getLegalDoc } from "@/lib/legal-content";
import type { LegalDocSlug } from "@/lib/legal";

/** Порядок как в реестре LEGAL_DOCS; текущий документ в переключалке не показываем (как на titlo.ru). */
export function LegalDocNav({
  current,
  locale,
  ariaLabel,
}: {
  current: LegalDocSlug;
  locale: AppLocale;
  ariaLabel: string;
}) {
  const items = getAllLegalDocSlugs()
    .filter((slug) => slug !== current)
    .map((slug) => ({
      slug,
      title: getLegalDoc(slug, locale).title,
    }));

  if (items.length === 0) return null;

  return (
    <nav
      aria-label={ariaLabel}
      className="mb-4 flex flex-wrap text-sm leading-snug"
      style={{ columnGap: "1.5rem", rowGap: "0.5rem" }}
    >
      {items.map((item) => (
        <Link
          key={item.slug}
          href={`/legal/${item.slug}`}
          className="text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          {item.title}
        </Link>
      ))}
    </nav>
  );
}
