"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PreviewBanner({
  mode,
  label,
  sublabel,
}: {
  mode: "player" | "club";
  label: string;
  sublabel?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function exitPreview() {
    setLoading(true);
    await fetch("/api/admin/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "clear" }),
    });
    setLoading(false);
    router.push("/admin/preview");
    router.refresh();
  }

  return (
    <div className="preview-banner">
      <div className="preview-banner-inner">
        <p className="preview-banner-text">
          <span className="preview-banner-badge">
            {mode === "player" ? "Просмотр как игрок" : "Просмотр как владелец клуба"}
          </span>
          <span className="font-medium">{label}</span>
          {sublabel && <span className="text-zinc-400"> · {sublabel}</span>}
        </p>
        <button
          type="button"
          onClick={exitPreview}
          disabled={loading}
          className="preview-banner-exit"
        >
          {loading ? "…" : "Выйти из режима"}
        </button>
      </div>
    </div>
  );
}
