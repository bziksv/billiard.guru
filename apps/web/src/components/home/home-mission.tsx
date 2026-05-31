import Link from "next/link";
import { HOME_FEATURES } from "@/lib/home-content";

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
              Турниры сегодня — спарринг-партнёр завтра
            </h2>
            <p className="home-section-lead mt-4 leading-relaxed">
              <strong className="font-medium text-[var(--text-primary)]">billiard.guru</strong>{" "}
              создан для публикации турниров, новостей бильярдного сообщества и поиска игры
              рядом с вами. Клубы проводят события и рассылают уведомления подписчикам в
              Telegram. Игроки ведут профиль, рейтинг и объявления.
            </p>
            <p className="home-card-muted mt-4 leading-relaxed">
              В ближайших релизах — Telegram-бот для подбора спарринг-партнёра в вашем
              городе: укажите рейтинг, дисциплину и удобные клубы для игры.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/tournaments" className="site-btn-primary">
                Турниры
              </Link>
              <Link href="/clubs" className="site-btn-secondary">
                Клубы
              </Link>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {HOME_FEATURES.map((f) => (
              <li key={f.title} className="home-content-card rounded-2xl p-5">
                <span className="text-2xl" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="home-card-title mt-3 font-semibold">{f.title}</h3>
                <p className="home-card-body mt-2 text-sm leading-relaxed">{f.desc}</p>
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
              Войти через Telegram
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
