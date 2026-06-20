import Link from "next/link";

type Crumb = { href?: string; label: string };

export function RulesBreadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Навигация" className="rules-breadcrumbs">
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
