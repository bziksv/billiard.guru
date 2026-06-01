"use client";

import { use } from "react";
import { ClubEditView } from "@/components/club/club-edit-view";

export default function AdminClubEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ClubEditView clubId={id} variant="admin" />;
}
