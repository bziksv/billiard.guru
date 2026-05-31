"use client";

import { useRouter } from "next/navigation";
import { IconLogout } from "@/components/admin/admin-nav-icons";
import { cn } from "@/lib/cn";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      title={collapsed ? "Выйти" : undefined}
      className={cn(
        "flex w-full items-center rounded-lg text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
      )}
    >
      <IconLogout className="h-5 w-5 shrink-0" />
      {!collapsed && <span>Выйти</span>}
    </button>
  );
}
