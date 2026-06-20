"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType } from "react";
import { useAdminSidebarCollapsed } from "@/hooks/use-admin-sidebar-collapsed";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  IconCabinet,
  IconClubs,
  IconCollapse,
  IconExpand,
  IconAnalytics,
  IconBrackets,
  IconDatabaseBackup,
  IconHandicap,
  IconIdeas,
  IconNews,
  IconNotifications,
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
  { href: "/admin/brackets", label: "Сетки", icon: IconBrackets },
  { href: "/admin/notifications", label: "Уведомления", icon: IconNotifications },
  { href: "/admin/analytics", label: "Статистика посетителей", icon: IconAnalytics },
  { href: "/admin/club-news", label: "Новости клубов", icon: IconNews },
  { href: "/admin/site-news", label: "Новости сервиса", icon: IconNews },
  { href: "/admin/ideas", label: "Идеи", icon: IconIdeas },
  { href: "/admin/handicap", label: "Фора и расчёт", icon: IconHandicap },
  { href: "/admin/db-backups", label: "Бэкап БД", icon: IconDatabaseBackup },
  { href: "/admin/preview", label: "Просмотр как…", icon: IconCabinet },
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
        "admin-nav-item w-full",
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
  const { collapsed, narrow, ready, toggle } = useAdminSidebarCollapsed(STORAGE_KEY);

  return (
    <>
      {narrow && !collapsed && (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={toggle}
        />
      )}
      <aside
        className={cn(
          "admin-sidebar flex shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm transition-[width] duration-200 ease-out",
          narrow && !collapsed
            ? "fixed left-4 top-4 z-50 h-[calc(100vh-2rem)] w-60 shadow-lg"
            : "sticky top-4 h-[calc(100vh-2rem)] lg:top-6 lg:h-[calc(100vh-3rem)]",
          collapsed ? "w-[4.25rem]" : "w-60",
          !ready && "w-60 max-md:w-[4.25rem]",
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

      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2",
          collapsed && "scrollbar-none",
        )}
      >
        {NAV.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            collapsed={collapsed}
            active={isActive(item.href, pathname)}
          />
        ))}
      </nav>

      <div className="admin-sidebar-footer admin-divider mt-auto flex shrink-0 flex-col gap-0.5 border-t p-2">
        {userName && !collapsed && (
          <div className="px-3 py-2 text-sm">
            <p className="truncate admin-text-secondary">{userName}</p>
            <p className="text-xs text-emerald-500">Суперадмин</p>
          </div>
        )}

        <NavLink
          href="/admin/cabinet"
          label="Личный кабинет"
          icon={IconCabinet}
          collapsed={collapsed}
          active={
            pathname.startsWith("/admin/cabinet") || pathname.startsWith("/cabinet")
          }
        />

        <LogoutButton collapsed={collapsed} />

        <ThemeToggle variant="admin" collapsed={collapsed} showLabel />

        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Развернуть меню" : "Свернуть меню"}
          className={cn(
            "admin-nav-muted flex w-full items-center rounded-lg text-sm transition-colors",
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
          )}
        >
          {collapsed ? (
            <IconExpand className="h-5 w-5 shrink-0" />
          ) : (
            <IconCollapse className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span>Свернуть меню</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
