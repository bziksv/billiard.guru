"use client";

import dynamic from "next/dynamic";
import type { ClubMapClientProps } from "@/components/site/club-map-client";

const ClubMapClient = dynamic(
  () => import("@/components/site/club-map-client").then((m) => m.ClubMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
    ),
  },
);

export function ClubMap(props: ClubMapClientProps) {
  return <ClubMapClient {...props} />;
}
