import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import { LEGAL_DOCS } from "@/lib/legal";
import { legalDocMetadata } from "@/lib/seo";

type DocParam = keyof typeof LEGAL_DOCS;

export async function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const entry = LEGAL_DOCS[doc as DocParam];
  if (!entry) return { title: "Документ" };
  return legalDocMetadata(doc as DocParam);
}

export default async function LegalDocumentPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  const entry = LEGAL_DOCS[doc as DocParam];
  if (!entry) notFound();

  return (
    <>
      <PageHeader title={entry.title} lead={entry.description} />
      <PageMain className="pt-0">
        <SiteCard className="space-y-4">
          <p className="guide-body-text text-sm leading-relaxed">
            Текст документа будет опубликован на этой странице. Вы можете разместить файл по
            адресу{" "}
            <code className="rounded bg-[var(--bg-muted)] px-1.5 py-0.5 text-xs">
              public{entry.filePath}
            </code>{" "}
            или заменить содержимое страницы в коде.
          </p>
          <p className="guide-body-text text-sm">
            <Link href={entry.filePath} className="text-emerald-600 hover:underline">
              Скачать документ (PDF)
            </Link>{" "}
            — ссылка заработает после загрузки файла.
          </p>
          <Link href="/" className="inline-block text-sm text-emerald-600 hover:underline">
            ← На главную
          </Link>
        </SiteCard>
      </PageMain>
    </>
  );
}
