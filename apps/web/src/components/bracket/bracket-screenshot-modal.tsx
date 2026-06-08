"use client";

import { useEffect, useState } from "react";
import {
  bracketScreenshotFilename,
  downloadBlob,
  shareBracketScreenshot,
} from "@/lib/bracket-screenshot";

export function BracketScreenshotModal({
  open,
  tournamentName,
  tournamentUrl,
  blob,
  previewUrl,
  onClose,
}: {
  open: boolean;
  tournamentName: string;
  tournamentUrl: string;
  blob: Blob | null;
  previewUrl: string | null;
  onClose: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setHint(null);
      setSharing(false);
    }
  }, [open]);

  if (!open || !blob || !previewUrl) return null;

  const filename = bracketScreenshotFilename(tournamentName);

  async function handleShare() {
    if (!blob) return;
    setSharing(true);
    setHint(null);
    try {
      const result = await shareBracketScreenshot({
        blob,
        filename,
        tournamentName,
        tournamentUrl,
      });
      if (result === "shared") {
        setHint("Выберите Telegram (или другое приложение) в системном меню «Поделиться».");
      } else if (result === "clipboard") {
        setHint("Изображение скопировано — вставьте в чат Telegram (Ctrl+V / Cmd+V).");
      } else {
        setHint("PNG скачан — прикрепите файл в Telegram вручную.");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setHint("Не удалось поделиться — скачайте PNG и отправьте в Telegram вручную.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className="bracket-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bracket-modal-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bracket-screenshot-title"
      >
        <div className="border-b border-[var(--bracket-modal-border)] px-5 py-4">
          <h2 id="bracket-screenshot-title" className="text-lg font-semibold">
            Скрин сетки
          </h2>
          <p className="bracket-modal-muted mt-1 text-sm">
            Вся сетка на одном изображении — скачайте или отправьте в Telegram.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[var(--admin-inset-bg)] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`Сетка турнира ${tournamentName}`}
            className="mx-auto max-w-full rounded-lg border border-[var(--admin-border)] shadow-sm"
          />
        </div>

        {hint && (
          <p className="border-t border-[var(--bracket-modal-border)] px-5 py-3 text-sm text-[var(--admin-text-secondary)]">
            {hint}
          </p>
        )}

        <div className="bracket-modal-footer flex flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="admin-btn admin-btn--outline px-4 py-2 text-sm"
          >
            Закрыть
          </button>
          <button
            type="button"
            disabled={sharing}
            onClick={() => void handleShare()}
            className="admin-btn admin-btn--primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {sharing ? "…" : "Поделиться в Telegram"}
          </button>
          <button
            type="button"
            onClick={() => blob && downloadBlob(blob, filename)}
            className="admin-btn admin-btn--outline px-4 py-2 text-sm"
          >
            Скачать PNG
          </button>
        </div>
      </div>
    </div>
  );
}
