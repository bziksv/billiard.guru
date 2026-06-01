import { AdminPreviewPanel } from "@/components/admin/admin-preview-panel";

export default function AdminPreviewPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Просмотр от имени пользователя</h1>
      <p className="mb-8 max-w-2xl text-sm text-zinc-400">
        Суперадмин может посмотреть сайт глазами игрока или владельца клуба. Ваш доступ к
        админ-панели сохраняется — на сайте показывается жёлтая полоса «режим просмотра».
      </p>
      <AdminPreviewPanel />
    </div>
  );
}
