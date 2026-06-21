import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { syncLocalizedTitleBody, type PublishLocale } from "@/lib/translation";

export function serializeSiteNews(item: {
  id: string;
  title: string;
  body: string;
  titleEn?: string | null;
  bodyEn?: string | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  author: { id: string; firstName: string; lastName: string } | null;
}) {
  return {
    id: item.id,
    title: item.title,
    body: item.body,
    titleEn: item.titleEn ?? null,
    bodyEn: item.bodyEn ?? null,
    status: item.status,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    author: item.author,
  };
}

const siteNewsInclude = {
  author: { select: { id: true, firstName: true, lastName: true } },
} as const;

export async function createSiteNews(input: {
  authorId: string;
  title: string;
  body: string;
  publishLocale?: PublishLocale;
}) {
  const localized = await syncLocalizedTitleBody({
    publishLocale: input.publishLocale,
    title: input.title,
    body: input.body,
  });
  const now = new Date();
  const item = await prisma.siteNews.create({
    data: {
      title: localized.title,
      body: localized.body ?? "",
      titleEn: localized.titleEn,
      bodyEn: localized.bodyEn,
      status: "APPROVED",
      authorId: input.authorId,
      publishedAt: now,
    },
    include: siteNewsInclude,
  });

  await writeAuditLog({
    actorType: "admin",
    actorId: input.authorId,
    action: "site.news.publish",
    entityType: "site_news",
    entityId: item.id,
    section: "news",
    summary: `Новость сервиса: ${item.title}`,
  });

  return item;
}

export async function unpublishSiteNews(id: string, actorId: string) {
  const item = await prisma.siteNews.findUnique({ where: { id } });
  if (!item) return { ok: false as const, message: "Новость не найдена" };
  if (item.status !== "APPROVED") {
    return { ok: false as const, message: "Снять можно только опубликованную новость" };
  }

  await prisma.siteNews.update({
    where: { id },
    data: { status: "UNPUBLISHED", publishedAt: null },
  });

  await writeAuditLog({
    actorType: "admin",
    actorId,
    action: "site.news.unpublish",
    entityType: "site_news",
    entityId: id,
    section: "news",
    summary: `Снято с публикации: ${item.title}`,
  });

  return { ok: true as const, message: "Новость снята с публикации" };
}

export async function republishSiteNews(id: string, actorId: string) {
  const item = await prisma.siteNews.findUnique({ where: { id } });
  if (!item) return { ok: false as const, message: "Новость не найдена" };
  if (item.status === "APPROVED") {
    return { ok: false as const, message: "Новость уже опубликована" };
  }

  const publishedAt = item.publishedAt ?? new Date();
  await prisma.siteNews.update({
    where: { id },
    data: { status: "APPROVED", publishedAt },
  });

  await writeAuditLog({
    actorType: "admin",
    actorId,
    action: "site.news.republish",
    entityType: "site_news",
    entityId: id,
    section: "news",
    summary: `Снова опубликовано: ${item.title}`,
  });

  return { ok: true as const, message: "Новость снова на сайте" };
}

export async function deleteSiteNews(id: string, actorId: string) {
  const item = await prisma.siteNews.findUnique({ where: { id } });
  if (!item) return { ok: false as const, message: "Новость не найдена" };

  await prisma.siteNews.delete({ where: { id } });

  await writeAuditLog({
    actorType: "admin",
    actorId,
    action: "site.news.delete",
    entityType: "site_news",
    entityId: id,
    section: "news",
    summary: `Удалено: ${item.title}`,
  });

  return { ok: true as const, message: "Новость удалена" };
}

export async function listSiteNewsAdmin() {
  return prisma.siteNews.findMany({
    include: siteNewsInclude,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function getPublishedSiteNews(id: string) {
  return prisma.siteNews.findFirst({
    where: { id, status: "APPROVED" },
    include: siteNewsInclude,
  });
}
