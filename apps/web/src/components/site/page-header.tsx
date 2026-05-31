import { SiteContainer } from "@/components/site/site-container";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  lead,
  children,
  className,
}: {
  title: string;
  lead?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <SiteContainer className={cn("py-10 pb-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="site-page-title">{title}</h1>
          {lead && <p className="site-lead mt-2 max-w-2xl">{lead}</p>}
        </div>
        {children}
      </div>
    </SiteContainer>
  );
}

export function PageMain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <SiteContainer className={cn("pb-16", className)}>{children}</SiteContainer>
  );
}
