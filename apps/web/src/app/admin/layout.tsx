import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentPlayer, getRealPlayer, getSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PageviewBeacon } from "@/components/analytics/pageview-beacon";
import { SessionKeepAlive } from "@/components/auth/session-keep-alive";
import { ADMIN_PAGE_TITLES } from "@/lib/admin-page-title";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default: ADMIN_PAGE_TITLES.overview,
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  // Роль из БД — cookie могла устареть после смены прав или чужого логина.
  const realPlayer = await getRealPlayer();
  if (!session || !realPlayer || realPlayer.role !== "SUPERADMIN") {
    redirect("/login?next=/admin");
  }

  const player = await getCurrentPlayer();

  return (
    <div className="admin-app admin-shell flex h-screen w-full min-w-0 overflow-hidden gap-4 p-4 lg:gap-6 lg:p-6">
      <AdminSidebar
        userName={
          player
            ? `${player.lastName} ${player.firstName}`
            : undefined
        }
      />
      <main className="admin-main min-h-0 min-w-0 w-full flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
      <SessionKeepAlive />
      <PageviewBeacon surface="ADMIN" />
    </div>
  );
}
