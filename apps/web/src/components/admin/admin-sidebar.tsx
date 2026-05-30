import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { LogoutButton } from "@/components/auth/logout-button";

const NAV = [
  { href: "/admin", label: "Обзор" },
  { href: "/admin/clubs", label: "Клубы" },
  { href: "/admin/players", label: "Игроки" },
  { href: "/admin/tournaments", label: "Турниры" },
  { href: "/admin/handicap", label: "Калькулятор форы" },
];

export function AdminSidebar({ userName }: { userName?: string }) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-8">
        <Link href="/" className="text-lg font-bold text-emerald-400">
          {APP_NAME}
        </Link>
        <p className="text-xs text-zinc-500">Админ-панель</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto space-y-2 border-t border-zinc-800 pt-4 text-sm">
        {userName && (
          <p className="text-zinc-400">
            {userName}
            <span className="mt-0.5 block text-xs text-emerald-500">Суперадмин</span>
          </p>
        )}
        <Link href="/cabinet" className="block text-zinc-400 hover:text-white">
          Личный кабинет
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
