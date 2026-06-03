import { Suspense } from "react";
import { BracketsAdminPage } from "@/components/admin/brackets-admin-page";

export default function AdminBracketsPage() {
  return (
    <Suspense fallback={<p className="admin-muted text-sm">Загрузка…</p>}>
      <BracketsAdminPage />
    </Suspense>
  );
}
