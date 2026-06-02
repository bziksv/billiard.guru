"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TeamPlayer } from "@/lib/pair-tournament";
import { formatRating } from "@/lib/rating";
import { USER_ROLE_LABELS } from "@/lib/validators";

interface PlayerDetails {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string;
  email?: string | null;
  photoUrl?: string | null;
  telegramUsername?: string | null;
  rating: number;
  role?: string;
  isVerified?: boolean;
  birthDate?: string | null;
  city?: { nameRu: string; country: { nameRu: string } };
}

function playerName(p: Pick<PlayerDetails, "firstName" | "lastName" | "middleName">) {
  return `${p.lastName} ${p.firstName}${p.middleName ? ` ${p.middleName}` : ""}`;
}

export function PlayerCardModal({
  playerId,
  preview,
  open,
  onClose,
}: {
  playerId: string | null;
  preview?: TeamPlayer | null;
  open: boolean;
  onClose: () => void;
}) {
  const [player, setPlayer] = useState<PlayerDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !playerId) {
      setPlayer(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setPlayer(null);
    setLoading(true);
    setError(null);

    fetch(`/api/players/${playerId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить");
        if (!cancelled) setPlayer(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, playerId]);

  if (!open || !playerId) return null;

  const previewName =
    preview && preview.id === playerId
      ? `${preview.lastName} ${preview.firstName}`
      : null;
  const name = player ? playerName(player) : previewName ?? "Игрок";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md min-h-[280px] rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">Карточка игрока</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-xl text-zinc-500">
                {(previewName ?? name)[0]}
              </div>
              <div>
                <p className="text-lg font-medium">{name}</p>
                {preview && preview.id === playerId && (
                  <p className="text-sm text-zinc-500">
                    Рейтинг{" "}
                    <span className="font-mono text-emerald-400">
                      {formatRating(preview.rating)}
                    </span>
                  </p>
                )}
                <p className="mt-1 text-sm text-zinc-500">Загрузка…</p>
              </div>
            </div>
          </div>
        )}

        {!loading && error && !player && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {!loading && player && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {player.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={player.photoUrl}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-xl text-zinc-400">
                  {player.firstName[0]}
                </div>
              )}
              <div>
                <p className="text-lg font-medium">{name}</p>
              </div>
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Рейтинг</dt>
                <dd className="mt-0.5 font-mono text-emerald-400">
                  {formatRating(player.rating)}
                </dd>
              </div>
              {player.city && (
                <div>
                  <dt className="text-zinc-500">Город</dt>
                  <dd className="mt-0.5">
                    {player.city.nameRu}, {player.city.country.nameRu}
                  </dd>
                </div>
              )}
              {player.phone && (
                <div>
                  <dt className="text-zinc-500">Телефон</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`tel:${player.phone}`}
                      className="font-mono hover:text-emerald-400"
                    >
                      {player.phone}
                    </a>
                  </dd>
                </div>
              )}
              {player.email && (
                <div>
                  <dt className="text-zinc-500">Email</dt>
                  <dd className="mt-0.5">{player.email}</dd>
                </div>
              )}
              {player.telegramUsername && (
                <div>
                  <dt className="text-zinc-500">Telegram</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`https://t.me/${player.telegramUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-sky-400"
                    >
                      @{player.telegramUsername}
                    </a>
                  </dd>
                </div>
              )}
              {player.role && (
                <div>
                  <dt className="text-zinc-500">Роль</dt>
                  <dd className="mt-0.5">{USER_ROLE_LABELS[player.role] ?? player.role}</dd>
                </div>
              )}
              {player.isVerified !== undefined && (
                <div>
                  <dt className="text-zinc-500">Статус</dt>
                  <dd className="mt-0.5">
                    {player.isVerified ? "Подтверждён" : "Ожидает подтверждения"}
                  </dd>
                </div>
              )}
            </dl>

            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href={`/players/${player.id}`}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500"
                onClick={onClose}
              >
                Профиль на сайте
              </Link>
              <Link
                href="/admin/players"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500"
                onClick={onClose}
              >
                В админке
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
