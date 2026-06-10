import { SiteNewsAdminPage } from "@/components/admin/site-news-admin-page";
import { APP_NAME } from "@/lib/brand";

export default function AdminSiteNewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">Новости сервиса</h1>
        <p className="admin-page-lead mt-2 text-sm">
          Официальные анонсы {APP_NAME}: обновления платформы, новые функции, важные сообщения.
          Отдельно от новостей клубов — публикуются сразу на главной.
        </p>
      </div>
      <SiteNewsAdminPage />
    </div>
  );
}
