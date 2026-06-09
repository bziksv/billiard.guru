"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ComponentType } from "react";
import { useAdminSidebarCollapsed } from "@/hooks/use-admin-sidebar-collapsed";
import {
  IconBookings,
  IconCabinet,
  IconClubs,
  IconCollapse,
  IconExpand,
  IconFloorPlan,
  IconIdeas,
  IconNews,
  IconPlayers,
  IconStaff,
  IconTariffs,
  IconTournaments,
} from "@/components/admin/admin-nav-icons";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { usePendingBookingsBadge } from "@/components/manage/use-pending-bookings-badge";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { pendingBookingsBadgeLabel } from "@/lib/club-pending-bookings-badge";

const STORAGE_KEY = "setka-manage-sidebar-collapsed";

type ClubOption = { id: string; name: string };

function navForClub(clubId: string) {
  return [
    { href: `/manage/clubs/${clubId}`, label: "Клуб", icon: IconClubs, exact: true },
    { href: `/manage/clubs/${clubId}/floor`, label: "План зала", icon: IconFloorPlan },
    { href: `/manage/clubs/${clubId}/tariffs`, label: "Тарифы клуба", icon: IconTariffs },
    { href: `/manage/clubs/${clubId}/players`, label: "Игроки", icon: IconPlayers },
    { href: `/manage/clubs/${clubId}/staff`, label: "Сотрудники", icon: IconStaff },
    { href: `/manage/clubs/${clubId}/bookings`, label: "Брони столов", icon: IconBookings },
    { href: `/manage/clubs/${clubId}/tournaments`, label: "Турниры", icon: IconTournaments },
    { href: `/manage/clubs/${clubId}/news`, label: "Новости клуба", icon: IconNews },
    { href: `/manage/clubs/${clubId}/ideas`, label: "Идеи", icon: IconIdeas },
  ] as const;
}

function isActive(href: string, pathname: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon: Icon,
  collapsed,
  active,
  badge,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  collapsed: boolean;
  active: boolean;
  badge?: string | null;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? (badge ? `${label} · ${badge}` : label) : undefined}
      className={cn(
        "admin-nav-item w-full",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2",
        active && "admin-nav-item--active",
      )}
    >
      <span className="relative shrink-0">
        <Icon className="h-5 w-5" />
        {collapsed && badge && <span className="admin-nav-badge admin-nav-badge--dot" aria-hidden />}
      </span>
      {!collapsed && (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge && <span className="admin-nav-badge shrink-0">{badge}</span>}
        </>
      )}
    </Link>
  );
}

export function ClubOwnerSidebar({
  userName,
  clubs,
  activeClubId,
}: {
  userName?: string;
  clubs: ClubOption[];
  activeClubId: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, narrow, ready, toggle } = useAdminSidebarCollapsed(STORAGE_KEY);
  const nav = navForClub(activeClubId);
  const activeClub = clubs.find((c) => c.id === activeClubId);
  const pendingBookings = usePendingBookingsBadge(activeClubId);
  const pendingBookingsBadge = pendingBookingsBadgeLabel(pendingBookings);

  function switchClub(nextId: string) {
    const suffix = pathname.replace(`/manage/clubs/${activeClubId}`, "");
    router.push(`/manage/clubs/${nextId}${suffix || ""}`);
  }

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
      <div className={cn("admin-divider shrink-0 border-b p-3", collapsed && "flex justify-center px-2")}>
        <Link
          href="/"
          title={APP_NAME}
          className={cn(
            "font-bold text-emerald-400 transition-opacity hover:opacity-90",
            collapsed
              ? "flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/10 text-sm"
              : "block text-sm leading-tight",
          )}
        >
          {collapsed ? "B" : APP_NAME}
        </Link>
        {!collapsed && (
          <>
            <p className="admin-muted mt-0.5 text-[11px] leading-tight">Управление клубом</p>
            {userName && (
              <p className="mt-2 truncate text-xs text-zinc-400">{userName}</p>
            )}
            {activeClub && (
              <p className="mt-0.5 truncate text-sm font-medium text-zinc-200">{activeClub.name}</p>
            )}
            {clubs.length > 1 && (
              <label className="mt-3 block text-xs text-zinc-500">
                Клуб
                <select
                  className="site-input mt-1 w-full text-sm"
                  value={activeClubId}
                  onChange={(e) => switchClub(e.target.value)}
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!collapsed && (
              <Link
                href="/manage/clubs/new"
                className="mt-3 block rounded-lg border border-dashed border-zinc-700 px-3 py-2 text-center text-xs font-medium text-emerald-400 transition-colors hover:border-emerald-700 hover:bg-emerald-950/30"
              >
                + Добавить клуб
              </Link>
            )}
          </>
        )}
      </div>

      <nav
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2",
          collapsed && "scrollbar-none",
        )}
      >
        {nav.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            active={isActive(item.href, pathname, "exact" in item ? item.exact : undefined)}
            badge={item.href.endsWith("/bookings") ? pendingBookingsBadge : null}
          />
        ))}
      </nav>

      <div className="admin-sidebar-footer admin-divider mt-auto flex shrink-0 flex-col gap-0.5 border-t p-2">
        <NavLink
          href="/manage/cabinet"
          label="Личный кабинет"
          icon={IconCabinet}
          collapsed={collapsed}
          active={
            pathname.startsWith("/manage/cabinet") || pathname.startsWith("/cabinet")
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
          {collapsed ? <IconExpand className="h-5 w-5" /> : <IconCollapse className="h-5 w-5" />}
          {!collapsed && <span>Свернуть меню</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
