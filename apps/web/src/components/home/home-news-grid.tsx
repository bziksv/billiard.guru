import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { HomeNewsItem } from "@/lib/home-content";
import { APP_NAME } from "@/lib/brand";

function AuthorBadge({
  type,
  labels,
}: {
  type: HomeNewsItem["authorType"];
  labels: { service: string; club: string; player: string };
}) {
  if (type === "service") {
    return (
      <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
        {labels.service}
      </span>
    );
  }
  return (
    <span
      className={
        type === "club"
          ? "guide-format-badge px-2 py-0.5 text-[10px]"
          : "rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300"
      }
    >
      {type === "club" ? labels.club : labels.player}
    </span>
  );
}

function NewsCard({
  item,
  previewLabel,
  labels,
}: {
  item: HomeNewsItem;
  previewLabel: string;
  labels: { service: string; club: string; player: string };
}) {
  const inner = (
    <>
      {item.preview && (
        <span className="home-preview-label absolute right-3 top-3">{previewLabel}</span>
      )}
      <div className="home-card-muted flex flex-wrap items-center gap-2 text-xs">
        <AuthorBadge type={item.authorType} labels={labels} />
        <span>{item.date}</span>
        <span>·</span>
        <span>{item.city}</span>
      </div>
      <h3 className="home-card-title mt-3 font-semibold leading-snug group-hover:text-emerald-600">
        {item.title}
      </h3>
      <p className="home-card-body mt-2 line-clamp-3 text-sm leading-relaxed">
        {item.excerpt}
      </p>
      <p className="home-card-muted mt-4 text-xs">{item.authorName}</p>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="home-content-card home-card-glow group relative block overflow-hidden rounded-2xl p-5"
      >
        {inner}
      </Link>
    );
  }

  return (
    <article className="home-content-card home-card-glow group relative overflow-hidden rounded-2xl p-5">
      {inner}
    </article>
  );
}

export async function HomeNewsGrid({ items }: { items: HomeNewsItem[] }) {
  const t = await getTranslations("home.news");

  if (items.length === 0) {
    return (
      <div className="home-content-card rounded-2xl px-6 py-12 text-center">
        <p className="home-card-title font-medium">{t("emptyTitle")}</p>
        <p className="home-card-body mx-auto mt-2 max-w-md text-sm leading-relaxed">
          {t("emptyLead", { appName: APP_NAME })}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/clubs" className="site-btn-secondary">
            {t("browseClubs")}
          </Link>
          <Link href="/login" className="site-btn-primary">
            {t("clubLogin")}
          </Link>
        </div>
      </div>
    );
  }

  const labels = {
    service: t("service"),
    club: t("club"),
    player: t("player"),
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <NewsCard
          key={item.id}
          item={item}
          previewLabel={t("preview")}
          labels={labels}
        />
      ))}
    </div>
  );
}
