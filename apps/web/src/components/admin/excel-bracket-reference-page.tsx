"use client";

import Link from "next/link";
import { ExcelBracketView } from "@/components/bracket/excel-bracket-view";
import excelRef from "@/lib/excel-bracket-64-reference.json";

export function ExcelBracketReferencePage({
  backHref = "/admin/brackets",
}: {
  backHref?: string;
}) {
  const excelCount = excelRef.matches.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={backHref} className="admin-link mb-3 inline-block text-sm">
            ← Типы сеток
          </Link>
          <h1 className="admin-page-title mb-2">{excelRef.title}</h1>
          <p className="admin-page-lead max-w-3xl">
            Разметка из файла <strong>{excelRef.source}</strong> (лист «
            {excelRef.sheet}»): {excelCount} встреч (#1–#{excelCount}), позиции
            и подписи — как в Excel. Без турнира в базе.
          </p>
        </div>
      </div>

      <ExcelBracketView />
    </div>
  );
}
