import Link from "next/link";
import { cn } from "@/lib/cn";

export function SiteCard({
  children,
  className,
  href,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  id?: string;
}) {
  const classes = cn(href ? "site-card-interactive block p-5" : "site-card p-5", className);

  if (href) {
    return (
      <Link href={href} id={id} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <div id={id} className={classes}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="site-card px-5 py-10 text-center">
      <p className="font-medium text-zinc-300">{title}</p>
      {description && <p className="mt-2 text-sm text-zinc-500">{description}</p>}
    </div>
  );
}
