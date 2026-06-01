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
      <SiteContainer className="relative flex h-14 items-center gap-2 py-0 sm:gap-3 lg:h-16 lg:gap-4">
        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight text-emerald-400 lg:text-lg"
        >
          {APP_NAME}
        </Link>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2 lg:ml-0 lg:flex-1">
          <SiteHeaderNav />
          <ThemeToggle variant="site" />
          {player ? (
            <UserMenu
              firstName={player.firstName}
              lastName={player.lastName}
              isAdmin={isAdmin}
              manageHref={manageHref}
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
