import { IdeasAdminTable } from "@/components/admin/ideas-table";

export default function AdminIdeasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Идеи</h1>
        <p className="admin-page-lead mt-2 text-sm">
          Модерация предложений от игроков. Новые идеи приходят в Telegram с кнопками
          «Одобрить» / «Отклонить».
        </p>
      </div>
      <IdeasAdminTable />
    </div>
  );
}
