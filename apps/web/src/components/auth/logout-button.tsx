"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconLogout } from "@/components/admin/admin-nav-icons";
import { cn } from "@/lib/cn";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/auth/me", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      title={collapsed ? "Выйти" : undefined}
      className={cn(
        "admin-nav-muted flex w-full items-center rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
      )}
    >
      {loading ? (
        <span className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <IconLogout className="h-5 w-5 shrink-0" />
      )}
      {!collapsed && <span>{loading ? "Выход…" : "Выйти"}</span>}
    </button>
  );
}
