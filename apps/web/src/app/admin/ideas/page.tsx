import { IdeasAdminTable } from "@/components/admin/ideas-table";

export default function AdminIdeasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Идеи</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Модерация предложений от игроков. Новые идеи приходят в Telegram с кнопками
          «Одобрить» / «Отклонить».
        </p>
      </div>
      <IdeasAdminTable />
    </div>
  );
}
