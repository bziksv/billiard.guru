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
    <header className="site-header-shell border-b backdrop-blur-xl backdrop-saturate-150">
      <SiteContainer className="flex h-14 items-center gap-3 py-0 sm:gap-4 lg:h-16">
        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight text-emerald-400 lg:text-lg"
        >
          {APP_NAME}
        </Link>

        <div className="min-w-0 flex-1 overflow-visible">
          <SiteHeaderNav />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
