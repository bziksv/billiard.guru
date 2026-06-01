import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SiteHeaderNav } from "@/components/site/site-header-nav";
import { UserMenu } from "@/components/site/user-menu";
import { SiteContainer } from "@/components/site/site-container";
import { getCurrentPlayer, getImpersonation, getSession, isSuperAdmin } from "@/lib/auth";
import { getAccessibleOwnedClubs } from "@/lib/club-owner-access";
import { APP_NAME } from "@/lib/brand";
import { t } from "@/lib/site";

export async function SiteHeader() {
  const session = await getSession();
  const impersonation = await getImpersonation();
  const player = await getCurrentPlayer();
  const isAdmin = Boolean(session && isSuperAdmin(session.role) && !impersonation);
  const ownedClubs = player ? await getAccessibleOwnedClubs() : [];
  const manageHref =
    ownedClubs.length > 0
      ? ownedClubs.length === 1
        ? `/manage/clubs/${ownedClubs[0]!.id}`
        : "/manage"
      : null;

  return (
    <header className="site-header-shell overflow-visible border-b backdrop-blur-xl backdrop-saturate-150">
      <SiteContainer className="site-header-inner relative flex h-14 items-center gap-2 py-0 sm:gap-3 lg:h-16">
        <div className="site-header-start">
          <Link
            href="/"
            className="site-header-logo shrink-0 text-base font-bold leading-none tracking-tight text-emerald-400 lg:text-lg"
          >
            {APP_NAME}
          </Link>

          <SiteHeaderNav
            account={
              player
                ? {
                    firstName: player.firstName,
                    lastName: player.lastName,
                    isAdmin,
                    manageHref,
                  }
                : undefined
            }
          />
        </div>

        <div className="site-header-actions">
          <ThemeToggle variant="site" className="site-header-theme-toggle inline-flex" />
          {player ? (
            <UserMenu
              firstName={player.firstName}
              lastName={player.lastName}
              isAdmin={isAdmin}
              manageHref={manageHref}
            />
          ) : (
            <Link
              href="/login"
              className="site-btn-primary hidden whitespace-nowrap px-3 py-1.5 text-sm sm:inline-flex"
            >
              {t("nav.login")}
            </Link>
          )}
        </div>
      </SiteContainer>
    </header>
  );
}
