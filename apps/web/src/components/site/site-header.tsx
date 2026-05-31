import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SiteHeaderNav } from "@/components/site/site-header-nav";
import { UserMenu } from "@/components/site/user-menu";
import { SiteContainer } from "@/components/site/site-container";
import { getCurrentPlayer, isSuperAdmin } from "@/lib/auth";
import { APP_NAME } from "@/lib/brand";
import { t } from "@/lib/site";

export async function SiteHeader() {
  const player = await getCurrentPlayer();

  return (
    <header className="site-header-shell sticky top-0 z-40 border-b backdrop-blur-xl backdrop-saturate-150">
      <SiteContainer className="flex h-14 items-center gap-3 py-0 sm:gap-4 lg:h-16">
        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight text-emerald-400 lg:text-lg"
        >
          {APP_NAME}
        </Link>

        <div className="min-w-0 flex-1">
          <SiteHeaderNav />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle variant="site" />
          {player ? (
            <UserMenu
              firstName={player.firstName}
              lastName={player.lastName}
              isAdmin={isSuperAdmin(player.role)}
            />
          ) : (
            <Link href="/login" className="site-btn-primary whitespace-nowrap px-3 py-1.5 text-sm">
              {t("nav.login")}
            </Link>
          )}
        </div>
      </SiteContainer>
    </header>
  );
}
