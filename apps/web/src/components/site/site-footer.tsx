import Link from "next/link";
import { SiteContainer } from "@/components/site/site-container";
import { getCurrentPlayer } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { SITE_NAV, t } from "@/lib/site";

const HOME_ANCHORS = [
  { href: "/#news", label: "Новости" },
  { href: "/#tournaments", label: "Турниры" },
  { href: "/#clubs", label: "Клубы" },
  { href: "/rules", label: "Правила бильярда" },
  { href: "/brackets", label: "Турнирные сетки" },
] as const;

export async function SiteFooter() {
  const player = await getCurrentPlayer();

  return (
    <footer className="site-footer-shell mt-auto border-t">
      <SiteContainer className="flex flex-col gap-10 py-12 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <p className="text-lg font-semibold text-emerald-400">{APP_NAME}</p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            {t("footer.tagline")}
          </p>
          <p className="mt-4 text-xs text-zinc-600">
            Турниры · новости · спарринг-партнёр (Telegram) · уведомления клубов
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Разделы
            </p>
            <nav className="flex flex-col gap-2 text-sm text-zinc-400">
              {SITE_NAV.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-emerald-400">
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              На главной
            </p>
            <nav className="flex flex-col gap-2 text-sm text-zinc-400">
              {HOME_ANCHORS.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-emerald-400">
                  {item.label}
                </Link>
              ))}
              {player ? (
                <Link href="/cabinet" className="hover:text-emerald-400">
                  {t("nav.cabinet")}
                </Link>
              ) : (
                <Link href="/login" className="hover:text-emerald-400">
                  {t("nav.login")}
                </Link>
              )}
            </nav>
          </div>
        </div>
      </SiteContainer>
      <div className="site-footer-divider border-t py-4 text-center text-xs">
        © {new Date().getFullYear()} {APP_NAME}
      </div>
    </footer>
  );
}
