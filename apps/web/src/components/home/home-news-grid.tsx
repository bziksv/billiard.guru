import Link from "next/link";
import type { HomeNewsItem } from "@/lib/home-content";

function AuthorBadge({ type }: { type: HomeNewsItem["authorType"] }) {
  return (
    <span
      className={
        type === "club"
          ? "guide-format-badge px-2 py-0.5 text-[10px]"
          : "rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-700"
      }
    >
      {type === "club" ? "Клуб" : "Игрок"}
    </span>
  );
}

export function HomeNewsGrid({ items }: { items: HomeNewsItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item, index) => (
        <article
          key={item.id}
          className="home-content-card home-card-glow group relative overflow-hidden rounded-2xl p-5"
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          {item.preview && (
            <span className="home-preview-label absolute right-3 top-3">пример</span>
          )}
          <div className="home-card-muted flex flex-wrap items-center gap-2 text-xs">
            <AuthorBadge type={item.authorType} />
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
        </article>
      ))}

      <div className="flex flex-col justify-center rounded-2xl border border-dashed border-[var(--border-accent)] bg-[var(--accent-soft)] p-6 md:col-span-3 lg:col-span-1 lg:col-start-auto">
        <p className="text-sm font-medium text-emerald-700">Публикуйте свои новости</p>
        <p className="home-card-body mt-2 text-sm">
          Клубы и игроки смогут размещать анонсы через личный кабинет — с модерацией в
          админке.
        </p>
        <Link href="/login" className="site-btn-primary mt-4 w-fit text-sm">
          Войти
        </Link>
      </div>
    </div>
  );
}
