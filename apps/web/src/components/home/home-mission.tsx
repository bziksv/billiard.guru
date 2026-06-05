import Link from "next/link";
import type { HomeFeature } from "@/lib/home-content";
import { HOME_FEATURES } from "@/lib/home-content";
import { TELEGRAM_BOT_USERNAME } from "@/lib/brand";

function FeatureCard({ icon, title, desc }: HomeFeature) {
  return (
    <>
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <h3 className="home-card-title mt-3 font-semibold">{title}</h3>
      <p className="home-card-body mt-2 text-sm leading-relaxed">{desc}</p>
    </>
  );
}

export function HomeMission() {
  return (
    <section className="home-section-anchor home-section-alt border-y border-[var(--border-subtle)] py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600/80">
              О платформе
            </p>
            <h2 className="home-section-title mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Турниры, игра рядом и инструменты для клуба
            </h2>
            <p className="home-section-lead mt-4 leading-relaxed">
              <strong className="font-medium text-[var(--text-primary)]">billiard.guru</strong>{" "}
              — платформа для проведения турниров, публикации новостей и поиска игры в вашем
              городе. Организаторы ведут сетки и протокол, клубы — брони и объявления,
              игроки — рейтинг и «Покатать».
            </p>
            <p className="home-card-muted mt-4 leading-relaxed">
              Telegram-бот @{TELEGRAM_BOT_USERNAME}: турниры, уведомления о матчах, управление
              клубом и доска объявлений — без установки приложения.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/tournaments" className="site-btn-primary">
                Турниры
              </Link>
              <Link href="/brackets" className="site-btn-secondary">
                Форматы сеток
              </Link>
              <Link href="/pokatat" className="site-btn-secondary">
                Покатать
              </Link>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {HOME_FEATURES.map((f) => (
              <li key={f.title}>
                {f.href ? (
                  <Link href={f.href} className="home-content-card block rounded-2xl p-5 transition hover:border-emerald-800/40">
                    <FeatureCard {...f} />
                  </Link>
                ) : (
                  <div className="home-content-card rounded-2xl p-5">
                    <FeatureCard {...f} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function HomeCta() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="home-cta-card relative overflow-hidden rounded-3xl px-8 py-12 text-center md:px-16">
          <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-0 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
          <h2 className="home-section-title relative text-2xl font-bold md:text-3xl">
            Присоединяйтесь к сообществу
          </h2>
          <p className="home-section-lead relative mx-auto mt-4 max-w-xl">
            Зарегистрируйтесь как игрок или клуб — публикуйте турниры, новости и получайте
            аудиторию бильярдистов вашего города.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="site-btn-primary px-8 py-3">
              Войти и создать турнир
            </Link>
            <Link href="/brackets" className="site-btn-secondary px-8 py-3">
              Справочник сеток
            </Link>
            <Link href="/players" className="site-btn-secondary px-8 py-3">
              Рейтинг игроков
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
