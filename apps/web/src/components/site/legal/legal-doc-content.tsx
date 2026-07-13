import type { LegalDocSection } from "@/lib/legal-bodies";

function LegalDocTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="guide-table-shell">
      <table className="guide-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row[0] ?? "row"}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalDocContent({ sections }: { sections: LegalDocSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.title ?? section.paragraphs[0] ?? section.tables?.[0]?.headers[0]}>
          {section.title && <h2 className="site-section-title text-lg">{section.title}</h2>}
          <div className={section.title ? "mt-3 space-y-3" : "space-y-3"}>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="guide-body-text text-sm leading-relaxed">
                {paragraph}
              </p>
            ))}
            {section.tables?.map((table) => (
              <LegalDocTable
                key={table.headers.join("|")}
                headers={table.headers}
                rows={table.rows}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
