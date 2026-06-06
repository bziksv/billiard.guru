import Link from "next/link";
import { PageHeader, PageMain } from "@/components/site/page-header";
import { SiteCard } from "@/components/site/site-card";
import {
  BRACKETS_CHOOSE_ROWS,
  BRACKETS_FORMAT_GROUPS,
  BRACKETS_INDEX_INTRO,
  bracketIndexTeaser,
} from "@/lib/bracket-formats/index-content";
import type { PublicBracketFormat } from "@/lib/bracket-formats/public-formats";
import { BRACKET_PLATFORM_FEATURES } from "@/lib/bracket-formats/seo";

function FormatCard({ item }: { item: PublicBracketFormat }) {
  return (
    <Link
      href={`/brackets/${item.seo.slug}`}
      className="bracket-format-card-link"
    >
      <SiteCard className="h-full transition-colors hover:border-emerald-700/50">
        <span className="bracket-format-chip text-xs">{item.seo.participantBadge}</span>
        <h3 className="mt-3 font-semibold leading-snug">{item.seo.pageTitle}</h3>
        <p className="guide-body-text mt-2 line-clamp-2 text-sm leading-relaxed">
          {bracketIndexTeaser(item)}
        </p>
        <span className="mt-4 inline-block text-sm font-medium text-emerald-400">
          Демо-схема →
        </span>
      </SiteCard>
    </Link>
  );
}

export function BracketsIndexPage({
  enabledFormats,
}: {
  enabledFormats: PublicBracketFormat[];
}) {
  const groups = BRACKETS_FORMAT_GROUPS.map((group) => ({
    ...group,
    formats: enabledFormats.filter(group.match),
  })).filter((group) => group.formats.length > 0);

  return (
    <>
      <PageHeader
        title="Турнирные сетки"
        lead="Олимпийская, швейцарская и готовые схемы на 16, 32 и 64 участников — с демо и созданием турнира в один клик."
      >
        <Link href="/login?next=/cabinet" className="site-btn-primary shrink-0">
          Создать турнир
        </Link>
        <Link href="/tournaments" className="site-btn-secondary shrink-0">
          Смотреть турниры
        </Link>
      </PageHeader>

      <PageMain className="space-y-14 pt-0">
        <p className="guide-body-text max-w-3xl text-base leading-relaxed">
          {BRACKETS_INDEX_INTRO}
        </p>

        {groups.length > 0 ? (
          <div className="space-y-12">
            {groups.map((group) => (
              <section key={group.id}>
                <h2 className="site-section-title text-xl">{group.title}</h2>
                <p className="guide-body-text mt-2 max-w-2xl text-sm leading-relaxed">
                  {group.lead}
                </p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.formats.map((item) => (
                    <FormatCard key={item.definition.code} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <SiteCard>
            <p className="guide-body-text text-sm">
              Форматы сеток скоро появятся на платформе. Пока можно{" "}
              <Link href="/tournaments" className="text-emerald-400 hover:underline">
                посмотреть турниры
              </Link>{" "}
              или создать событие в кабинете.
            </p>
          </SiteCard>
        )}

        <section className="home-section-alt rounded-2xl border border-[var(--border-subtle)] p-6 md:p-8">
          <h2 className="site-section-title text-xl">Что даёт платформа</h2>
          <p className="guide-body-text mt-2 max-w-2xl text-sm">
            Не просто картинка сетки — живой турнир с регистрацией, результатами и
            уведомлениями.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BRACKET_PLATFORM_FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="home-content-card rounded-xl p-4"
              >
                <h3 className="font-medium leading-snug">{feature.title}</h3>
                <p className="guide-body-text mt-2 text-sm leading-relaxed">
                  {feature.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="site-section-title text-xl">Какой формат выбрать</h2>
          <p className="guide-body-text mt-2 max-w-2xl text-sm">
            Коротко — без таблиц Excel и ручной разметки.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="guide-table w-full min-w-[520px] text-sm">
              <thead>
                <tr>
                  <th className="text-left">Формат</th>
                  <th className="text-left">Когда подходит</th>
                  <th className="text-left">Состав</th>
                </tr>
              </thead>
              <tbody>
                {BRACKETS_CHOOSE_ROWS.map((row) => (
                  <tr key={row.format}>
                    <td className="font-medium">{row.format}</td>
                    <td>{row.forWhom}</td>
                    <td>{row.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="home-cta-card rounded-2xl p-6 md:p-8">
          <h2 className="site-section-title text-xl">Готовы провести турнир?</h2>
          <p className="guide-body-text mt-2 max-w-xl text-sm">
            Зарегистрируйтесь, выберите формат и пригласите игроков — сетка и результаты
            обновляются автоматически.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/login?next=/cabinet" className="site-btn-primary">
              Создать турнир
            </Link>
            <Link href="/tournaments" className="site-btn-secondary">
              Смотреть турниры
            </Link>
          </div>
        </section>
      </PageMain>
    </>
  );
}
