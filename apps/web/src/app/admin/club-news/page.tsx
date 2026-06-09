import { ClubNewsAdminTable } from "@/components/admin/club-news-table";

export default function AdminClubNewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Новости клубов</h1>
        <p className="admin-page-lead mt-2 text-sm">
          Модерация публикаций от клубов. Новые новости приходят в Telegram с кнопками
          «Одобрить» / «Отклонить». После одобрения новость появляется на странице клуба и в
          ленте на главной.
        </p>
      </div>
      <ClubNewsAdminTable />
    </div>
  );
}
