"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  IconCabinet,
  IconClubs,
  IconCollapse,
  IconExpand,
  IconHandicap,
  IconIdeas,
  IconOverview,
  IconPlayers,
  IconTournaments,
} from "@/components/admin/admin-nav-icons";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "setka-admin-sidebar-collapsed";

const NAV: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { href: "/admin", label: "Обзор", icon: IconOverview },
  { href: "/admin/clubs", label: "Клубы", icon: IconClubs },
  { href: "/admin/players", label: "Игроки", icon: IconPlayers },
  { href: "/admin/tournaments", label: "Турниры", icon: IconTournaments },
  { href: "/admin/ideas", label: "Идеи", icon: IconIdeas },
  { href: "/admin/handicap", label: "Калькулятор форы", icon: IconHandicap },
];

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "admin-nav-item",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
        active && "admin-nav-item--active",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function AdminSidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "admin-sidebar sticky top-4 flex h-[calc(100vh-2rem)] shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm transition-[width] duration-200 ease-out lg:top-6 lg:h-[calc(100vh-3rem)]",
        collapsed ? "w-[4.25rem]" : "w-60",
        !ready && "w-60",
      )}
    >
      <div className={cn("admin-divider shrink-0 border-b p-3", collapsed && "flex justify-center")}>
        <Link
          href="/"
          title={APP_NAME}
          className={cn(
            "font-bold text-emerald-400 transition-opacity hover:opacity-90",
            collapsed
              ? "flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10 text-sm"
              : "block text-lg leading-tight",
          )}
        >
          {collapsed ? "B" : APP_NAME}
        </Link>
        {!collapsed && (
          <p className="admin-muted mt-0.5 text-[11px] leading-tight">Админ-панель</p>
        )}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            collapsed={collapsed}
            active={isActive(item.href, pathname)}
          />
        ))}
      </nav>

      <div className="admin-sidebar-footer admin-divider mt-auto shrink-0 space-y-1 border-t p-2">
        {userName && !collapsed && (
          <div className="px-3 py-2 text-sm">
            <p className="truncate admin-text-secondary">{userName}</p>
            <p className="text-xs text-emerald-500">Суперадмин</p>
          </div>
        )}

        <NavLink
          href="/cabinet"
          label="Личный кабинет"
          icon={IconCabinet}
          collapsed={collapsed}
          active={pathname.startsWith("/cabinet")}
        />

        <LogoutButton collapsed={collapsed} />

        <ThemeToggle variant="admin" collapsed={collapsed} showLabel />

        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          className={cn(
            "admin-nav-muted flex w-full items-center rounded-lg text-sm transition-colors",
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
          )}
        >
          {collapsed ? <IconExpand /> : <IconCollapse />}
          {!collapsed && <span>Свернуть меню</span>}
        </button>
      </div>
    </aside>
  );
}
