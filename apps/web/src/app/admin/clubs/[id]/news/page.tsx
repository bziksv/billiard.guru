"use client";

import { use } from "react";
import Link from "next/link";
import { ClubNewsPanel } from "@/components/club/club-news-panel";

export default function AdminClubNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="space-y-6">
      <Link href={`/admin/clubs/${id}`} className="text-sm text-emerald-400 hover:underline">
        ← Профиль клуба
      </Link>
      <ClubNewsPanel clubId={id} siteHref={`/clubs/${id}#club-news`} />
    </div>
  );
}
