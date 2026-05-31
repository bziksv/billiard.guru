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
    <div className="flex min-h-screen bg-zinc-900 text-zinc-100">
      <AdminSidebar
        userName={
          player
            ? `${player.lastName} ${player.firstName}`
            : undefined
        }
      />
      <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
