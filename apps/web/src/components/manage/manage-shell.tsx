"use client";

import { usePathname } from "next/navigation";
import { ClubOwnerSidebar } from "@/components/manage/club-owner-sidebar";

type ClubOption = { id: string; name: string };

function clubIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/manage\/clubs\/([^/]+)/);
  const id = match?.[1] ?? null;
  if (!id || id === "new") return null;
  return id;
}

export function ManageShell({
  userName,
  clubs,
  children,
}: {
  userName: string;
  clubs: ClubOption[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeClubId = clubIdFromPath(pathname) ?? clubs[0]!.id;

  return (
    <div className="admin-app admin-shell flex h-screen overflow-hidden gap-4 p-4 lg:gap-6 lg:p-6">
      <ClubOwnerSidebar userName={userName} clubs={clubs} activeClubId={activeClubId} />
      <main className="admin-main min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
