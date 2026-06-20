import { redirect } from "next/navigation";
import { getCurrentPlayer, getSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { PageviewBeacon } from "@/components/analytics/pageview-beacon";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
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
      <PageviewBeacon surface="ADMIN" />
    </div>
  );
}
