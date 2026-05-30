import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100">
      <h1 className="text-4xl font-bold text-emerald-400">{APP_NAME}</h1>
      <p className="mt-2 text-zinc-400">{APP_TAGLINE}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500"
        >
          Войти
        </Link>
        <Link
          href="/cabinet"
          className="rounded-lg border border-zinc-700 px-6 py-3 font-medium hover:bg-zinc-900"
        >
          Личный кабинет
        </Link>
      </div>
    </div>
  );
}
