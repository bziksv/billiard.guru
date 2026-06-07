import { Suspense } from "react";
import { PlayersAdminTable } from "@/components/admin/players-table";

export default function PlayersPage() {
  return (
    <Suspense fallback={<p className="admin-muted p-6">Загрузка…</p>}>
      <PlayersAdminTable />
    </Suspense>
  );
}
