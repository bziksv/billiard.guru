"use client";

import { cn } from "@/lib/cn";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  variant = "default",
  loading = false,
  error = null,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="bracket-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={loading ? undefined : onClose}
    >
      <div
        className="bracket-modal-panel w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className="border-b border-[var(--bracket-modal-border)] px-5 py-4">
          <h2 id="confirm-modal-title" className="text-lg font-semibold leading-tight">
            {title}
          </h2>
          <p className="bracket-modal-muted mt-2 text-sm leading-relaxed">{description}</p>
        </div>

        <div className="space-y-3 px-5 py-4">
          {variant === "danger" && (
            <div className="bracket-modal-danger px-4 py-3 text-sm">
              <p className="text-xs leading-relaxed">
                Это действие нельзя отменить одной кнопкой «назад» — проверьте, что выбрали
                верный вариант.
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="bracket-modal-footer flex flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="admin-btn admin-btn--outline px-4 py-2 text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void onConfirm()}
            className={cn(
              "admin-btn px-4 py-2 text-sm disabled:opacity-50",
              variant === "danger" ? "admin-btn--danger" : "admin-btn--primary",
            )}
          >
            {loading ? "Выполняем…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
