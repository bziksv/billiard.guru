import Link from "next/link";
import { getTranslations } from "next-intl/server";

type Crumb = { href?: string; label: string };

export async function RulesBreadcrumbs({ items }: { items: Crumb[] }) {
  const t = await getTranslations("rules.breadcrumbs");

  return (
    <nav aria-label={t("aria")} className="rules-breadcrumbs">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((item, i) => (
          <li key={item.label} className="inline-flex items-center gap-1.5">
            {i > 0 && (
              <span className="rules-breadcrumbs-sep" aria-hidden>
                /
              </span>
            )}
            {item.href ? (
              <Link href={item.href} className="rules-breadcrumbs-link">
                {item.label}
              </Link>
            ) : (
              <span className="rules-breadcrumbs-current">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
