import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { APP_NAME, TELEGRAM_BOT_USERNAME } from "@/lib/brand";

const FEATURE_KEYS = [
  { key: "tournaments", href: "/tournaments", icon: "🏆" },
  { key: "brackets", href: "/brackets", icon: "📊" },
  { key: "pokatat", href: "/pokatat", icon: "🤝" },
  { key: "telegram", href: "/login", icon: "📱" },
  { key: "clubNews", href: "/clubs", icon: "📰" },
  { key: "booking", href: "/clubs", icon: "🎱" },
] as const;

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
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

export async function HomeMission() {
  const t = await getTranslations();

  return (
    <section className="home-section-anchor home-section-alt border-y border-[var(--border-subtle)] py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-600/80">
              {t("home.mission.eyebrow")}
            </p>
            <h2 className="home-section-title mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              {t("home.mission.title")}
            </h2>
            <p className="home-section-lead mt-4 leading-relaxed">
              <strong className="font-medium text-[var(--text-primary)]">{APP_NAME}</strong>{" "}
              {t("home.mission.body")}
            </p>
            <p className="home-card-muted mt-4 leading-relaxed">
              {t("home.mission.telegram", { bot: TELEGRAM_BOT_USERNAME })}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/tournaments" className="site-btn-primary">
                {t("nav.tournaments")}
              </Link>
              <Link href="/brackets" className="site-btn-secondary">
                {t("home.cta.brackets")}
              </Link>
              <Link href="/pokatat" className="site-btn-secondary">
                {t("nav.pokatat")}
              </Link>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {FEATURE_KEYS.map((f) => {
              const title = t(`home.mission.features.${f.key}.title`);
              const desc =
                f.key === "telegram"
                  ? t(`home.mission.features.${f.key}.desc`, {
                      bot: TELEGRAM_BOT_USERNAME,
                    })
                  : t(`home.mission.features.${f.key}.desc`);

              return (
                <li key={f.key}>
                  <Link
                    href={f.href}
                    className="home-content-card block rounded-2xl p-5 transition hover:border-emerald-800/40"
                  >
                    <FeatureCard icon={f.icon} title={title} desc={desc} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export async function HomeCta() {
  const t = await getTranslations();

  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="home-cta-card relative overflow-hidden rounded-3xl px-8 py-12 text-center md:px-16">
          <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 right-0 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl" />
          <h2 className="home-section-title relative text-2xl font-bold md:text-3xl">
            {t("home.ctaBlock.title")}
          </h2>
          <p className="home-section-lead relative mx-auto mt-4 max-w-xl">
            {t("home.ctaBlock.lead")}
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="site-btn-primary px-8 py-3">
              {t("home.ctaBlock.login")}
            </Link>
            <Link href="/brackets" className="site-btn-secondary px-8 py-3">
              {t("home.ctaBlock.brackets")}
            </Link>
            <Link href="/players" className="site-btn-secondary px-8 py-3">
              {t("home.ctaBlock.players")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
