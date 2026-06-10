import { ClubNewsAdminTable } from "@/components/admin/club-news-table";

export default function AdminClubNewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Новости клубов</h1>
        <p className="admin-page-lead mt-2 text-sm">
          Модерация публикаций от клубов. Новые новости приходят в Telegram с кнопками
          «Одобрить» / «Отклонить». Колонка «Рассылка» — платная опция рассылки игрокам города
          в мессенджеры (см. docs/MONETIZATION.md), пока недоступна. Новости самого сервиса — в
          разделе «Новости сервиса».
        </p>
      </div>
      <ClubNewsAdminTable />
    </div>
  );
}
