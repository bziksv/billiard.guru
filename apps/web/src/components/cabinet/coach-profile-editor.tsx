"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export function CoachProfileEditor({ playerId }: { playerId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [coachBio, setCoachBio] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/me/coach-profile");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось загрузить");
      return;
    }
    setIsCoach(Boolean(data.isCoach));
    setCoachBio(data.coachBio ?? "");
    setGallery(Array.isArray(data.coachGalleryUrls) ? data.coachGalleryUrls : []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/me/coach-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isCoach,
        coachBio: coachBio.trim() || null,
        coachGalleryUrls: gallery,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось сохранить");
      return;
    }
    setIsCoach(Boolean(data.isCoach));
    setCoachBio(data.coachBio ?? "");
    setGallery(Array.isArray(data.coachGalleryUrls) ? data.coachGalleryUrls : []);
    setMessage(isCoach ? "Профиль тренера сохранён" : "Вы больше не отображаетесь в каталоге тренеров");
  }

  async function onPhotoSelected(file: File | null) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("photo", file);
    const res = await fetch("/api/me/coach-photos", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Не удалось загрузить фото");
      return;
    }
    setGallery(Array.isArray(data.coachGalleryUrls) ? data.coachGalleryUrls : []);
  }

  function removePhoto(url: string) {
    setGallery((prev) => prev.filter((u) => u !== url));
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  return (
    <section className="site-card space-y-4 p-5">
      <div>
        <h2 className="site-section-title text-lg">Профиль тренера</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Если включено, вас увидят в{" "}
          <Link href="/coaches" className="text-emerald-600 hover:underline">
            каталоге тренеров
          </Link>{" "}
          с рейтингом и описанием.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={isCoach}
          onChange={(e) => setIsCoach(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Я тренирую</span>
          <span className="mt-0.5 block text-zinc-500">
            Показывать мою карточку на странице тренеров
          </span>
        </span>
      </label>

      {isCoach && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">О себе (кратко в каталоге, полностью на странице)</span>
            <textarea
              value={coachBio}
              onChange={(e) => setCoachBio(e.target.value)}
              rows={8}
              maxLength={8000}
              placeholder="Опыт, дисциплины, формат занятий, цены, контакты…"
              className="site-input w-full resize-y"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium">Фото</p>
            <div className="flex flex-wrap gap-2">
              {gallery.map((url) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    className="absolute right-0.5 top-0.5 rounded bg-black/60 px-1 text-[10px] text-white"
                    aria-label="Удалить"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-emerald-600 hover:underline">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading || gallery.length >= 12}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  void onPhotoSelected(f ?? null);
                  e.target.value = "";
                }}
              />
              {uploading ? "Загрузка…" : "+ Добавить фото"}
            </label>
          </div>

          {isCoach && (
            <p className="text-xs text-zinc-500">
              <Link href={`/coaches/${playerId}`} className="text-emerald-600 hover:underline">
                Открыть вашу страницу тренера
              </Link>
            </p>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <button type="button" onClick={() => void save()} disabled={saving} className="site-btn-primary">
        {saving ? "Сохранение…" : "Сохранить профиль тренера"}
      </button>
    </section>
  );
}
