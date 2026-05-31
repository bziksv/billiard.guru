"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { CitySelect } from "@/components/admin/city-select";

interface ClubNews {
  id: string;
  title: string;
  body: string;
  publishedAt: string;
}

interface Club {
  id: string;
  name: string;
  cityId: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  workingHours: string | null;
  tableCount: number | null;
  city: { nameRu: string; country: { nameRu: string } };
}

export default function AdminClubEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [clubId, setClubId] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [news, setNews] = useState<ClubNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [cityId, setCityId] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [tableCount, setTableCount] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsSaving, setNewsSaving] = useState(false);

  const load = useCallback(async (id: string) => {
    const [clubRes, newsRes] = await Promise.all([
      fetch(`/api/clubs/${id}`),
      fetch(`/api/clubs/${id}/news`),
    ]);
    const clubData = await clubRes.json();
    const newsData = await newsRes.json();
    if (!clubRes.ok) {
      setError(clubData.error ?? "Клуб не найден");
      setLoading(false);
      return;
    }
    setClub(clubData);
    setNews(Array.isArray(newsData) ? newsData : []);
    setName(clubData.name);
    setCityId(clubData.cityId);
    setEmail(clubData.email ?? "");
    setDescription(clubData.description ?? "");
    setAddress(clubData.address ?? "");
    setWorkingHours(clubData.workingHours ?? "");
    setTableCount(clubData.tableCount != null ? String(clubData.tableCount) : "");
    setLatitude(clubData.latitude != null ? String(clubData.latitude) : "");
    setLongitude(clubData.longitude != null ? String(clubData.longitude) : "");
    setLoading(false);
  }, []);

  useEffect(() => {
    params.then(({ id }) => {
      setClubId(id);
      load(id);
    });
  }, [params, load]);

  async function saveClub(e: FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const form = new FormData();
    form.set("name", name);
    form.set("cityId", cityId);
    form.set("email", email);
    form.set("description", description);
    form.set("address", address);
    form.set("workingHours", workingHours);
    form.set("tableCount", tableCount);
    form.set("latitude", latitude);
    form.set("longitude", longitude);
    if (photo) form.set("photo", photo);

    const res = await fetch(`/api/clubs/${clubId}`, { method: "PATCH", body: form });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Ошибка сохранения");
      return;
    }
    setClub(data);
    setPhoto(null);
    setMessage("Сохранено");
  }

  async function addNews(e: FormEvent) {
    e.preventDefault();
    if (!clubId) return;
    setNewsSaving(true);
    setError(null);
    const res = await fetch(`/api/clubs/${clubId}/news`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newsTitle, body: newsBody }),
    });
    const data = await res.json();
    setNewsSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось добавить новость");
      return;
    }
    setNews((prev) => [data, ...prev]);
    setNewsTitle("");
    setNewsBody("");
    setMessage("Новость опубликована");
  }

  async function deleteNews(newsId: string) {
    if (!clubId || !confirm("Удалить новость?")) return;
    const res = await fetch(`/api/clubs/${clubId}/news/${newsId}`, { method: "DELETE" });
    if (!res.ok) return;
    setNews((prev) => prev.filter((n) => n.id !== newsId));
  }

  if (loading) return <p className="text-sm text-zinc-500">Загрузка…</p>;
  if (!club) return <p className="text-sm text-red-400">{error ?? "Клуб не найден"}</p>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/clubs" className="text-sm text-emerald-400 hover:underline">
          ← Клубы
        </Link>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{club.name}</h1>
          <Link
            href={`/clubs/${club.id}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-emerald-600"
          >
            На сайте
          </Link>
        </div>
      </div>

      <form onSubmit={saveClub} className="max-w-2xl space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="font-semibold">Профиль клуба</h2>

        {club.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={club.photoUrl} alt="" className="h-32 w-48 rounded-lg object-cover" />
        )}

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Фото</span>
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Название</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="site-input w-full" required />
        </label>

        <CitySelect value={cityId} onChange={setCityId} />

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="site-input w-full" type="email" />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Описание</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="site-input w-full"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Адрес</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="site-input w-full" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Широта</span>
            <input value={latitude} onChange={(e) => setLatitude(e.target.value)} className="site-input w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-400">Долгота</span>
            <input value={longitude} onChange={(e) => setLongitude(e.target.value)} className="site-input w-full" />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Режим работы</span>
          <textarea
            value={workingHours}
            onChange={(e) => setWorkingHours(e.target.value)}
            rows={3}
            placeholder={"Пн–Чт 12:00–24:00\nПт–Сб 12:00–02:00\nВс 14:00–22:00"}
            className="site-input w-full"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-zinc-400">Количество столов</span>
          <input
            value={tableCount}
            onChange={(e) => setTableCount(e.target.value)}
            type="number"
            min="0"
            className="site-input w-full max-w-[120px]"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-400">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500 disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить"}
        </button>
      </form>

      <section className="max-w-2xl space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="font-semibold">Новости клуба</h2>

        <form onSubmit={addNews} className="space-y-3 border-b border-zinc-800 pb-4">
          <input
            value={newsTitle}
            onChange={(e) => setNewsTitle(e.target.value)}
            placeholder="Заголовок"
            className="site-input w-full"
            required
          />
          <textarea
            value={newsBody}
            onChange={(e) => setNewsBody(e.target.value)}
            placeholder="Текст новости"
            rows={4}
            className="site-input w-full"
            required
          />
          <button
            type="submit"
            disabled={newsSaving}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-emerald-600 disabled:opacity-50"
          >
            {newsSaving ? "Публикация…" : "Опубликовать"}
          </button>
        </form>

        {news.length === 0 ? (
          <p className="text-sm text-zinc-500">Новостей пока нет.</p>
        ) : (
          <ul className="space-y-3">
            {news.map((item) => (
              <li key={item.id} className="rounded-lg border border-zinc-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{item.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNews(item.id)}
                    className="shrink-0 text-xs text-red-400 hover:underline"
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
