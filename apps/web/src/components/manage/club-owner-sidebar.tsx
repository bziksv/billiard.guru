"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
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
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/cn";

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
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const nav = navForClub(activeClubId);
  const activeClub = clubs.find((c) => c.id === activeClubId);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function switchClub(nextId: string) {
    const suffix = pathname.replace(`/manage/clubs/${activeClubId}`, "");
    router.push(`/manage/clubs/${nextId}${suffix || ""}`);
  }

  return (
    <aside
      className={cn(
        "admin-sidebar sticky top-4 flex h-[calc(100vh-2rem)] shrink-0 flex-col overflow-hidden rounded-xl border shadow-sm transition-[width] duration-200 ease-out lg:top-6 lg:h-[calc(100vh-3rem)]",
        collapsed ? "w-[4.25rem]" : "w-60",
        !ready && "w-60",
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

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {nav.map(({ href, label, icon: Icon, exact }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            icon={Icon}
            collapsed={collapsed}
            active={isActive(href, pathname, exact)}
          />
        ))}
      </nav>

      <div className="admin-sidebar-footer admin-divider mt-auto shrink-0 space-y-1 border-t p-2">
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
  );
}
