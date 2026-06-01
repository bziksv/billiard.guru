"use client";

import { useId, useRef } from "react";

export function ClubPhotosEditor({
  photoUrls,
  pendingPreview,
  onPickFile,
  onRemove,
  removingUrl,
  uploading,
  disabled,
}: {
  photoUrls: string[];
  pendingPreview: string | null;
  onPickFile: (file: File) => void;
  onRemove: (url: string) => void | Promise<void>;
  removingUrl: string | null;
  uploading?: boolean;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="club-photos-editor space-y-3">
      <p className="admin-label">Фото клуба</p>

      {photoUrls.length === 0 && !pendingPreview ? (
        <p className="admin-muted text-sm">Пока нет фото — загрузите снимок зала или столов.</p>
      ) : (
        <div className="club-photos-editor__grid">
          {photoUrls.map((url) => (
            <div key={url} className="club-photos-editor__item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="club-photos-editor__img" />
              <button
                type="button"
                className="admin-btn admin-btn--danger club-photos-editor__remove"
                disabled={disabled || removingUrl === url}
                onClick={() => void onRemove(url)}
              >
                {removingUrl === url ? "Удаление…" : "Удалить"}
              </button>
            </div>
          ))}
          {pendingPreview && (
            <div className="club-photos-editor__item club-photos-editor__item--pending">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingPreview} alt="" className="club-photos-editor__img" />
              <span className="club-photos-editor__badge">Новое — нажмите «Сохранить»</span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPickFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="admin-btn admin-btn--primary"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Загрузка…" : "Загрузить фото"}
        </button>
      </div>
      <p className="admin-muted text-xs">JPG или PNG. Удаление сохраняется сразу; новый файл — после «Сохранить».</p>
    </div>
  );
}
