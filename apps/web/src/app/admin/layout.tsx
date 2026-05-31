import { redirect } from "next/navigation";
import { getCurrentPlayer, getSession } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

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
    <div className="admin-app admin-shell flex min-h-screen gap-4 p-4 lg:gap-6 lg:p-6">
      <AdminSidebar
        userName={
          player
            ? `${player.lastName} ${player.firstName}`
            : undefined
        }
      />
      <main className="admin-main min-w-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
