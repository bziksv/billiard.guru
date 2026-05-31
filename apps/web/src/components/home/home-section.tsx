import Link from "next/link";
import type { ReactNode } from "react";

export function HomeSection({
  id,
  eyebrow,
  title,
  lead,
  action,
  children,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`home-section-anchor py-16 md:py-20 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-500/80">
                {eyebrow}
              </p>
            )}
            <h2 className="home-section-title text-2xl font-bold tracking-tight md:text-3xl">
              {title}
            </h2>
            {lead && <p className="home-section-lead mt-3">{lead}</p>}
          </div>
          {action && (
            <Link
              href={action.href}
              className="text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              {action.label} →
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
