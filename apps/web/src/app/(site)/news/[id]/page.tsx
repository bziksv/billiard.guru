import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { APP_NAME } from "@/lib/brand";
import { getPublishedSiteNews } from "@/lib/site-news-server";
import { siteNewsMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getPublishedSiteNews(id);
  if (!item) return { title: "Новость не найдена" };
  const excerpt = item.body.slice(0, 160);
  return siteNewsMetadata(item.title, excerpt, id);
}

export default async function SiteNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await getPublishedSiteNews(id);
  if (!item) notFound();

  const date = (item.publishedAt ?? item.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <PageHeader title={item.title} lead={`${APP_NAME} · ${date}`}>
        <Link href="/#news" className="site-btn-secondary text-sm">
          ← На главную
        </Link>
      </PageHeader>
      <PageMain className="max-w-3xl">
        <article className="site-card space-y-4 p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-600 dark:text-violet-400">
            Новость сервиса
          </p>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
            {item.body}
          </div>
          <div className="border-t border-[var(--border)] pt-4 text-sm text-[var(--text-muted)]">
            <Link href="/#news" className="text-emerald-600 hover:underline dark:text-emerald-400">
              Все новости на главной
            </Link>
          </div>
        </article>
      </PageMain>
    </>
  );
}
