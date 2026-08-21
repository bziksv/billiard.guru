import type { ReactNode } from "react";
import type { LegalDocSection } from "@/lib/legal-bodies";

const LINKABLE =
  /(https?:\/\/[^\s<>"']+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

const TRAILING_PUNCT = /[.,;:!?)\]»"]+$/u;

const linkClassName =
  "text-emerald-700 underline underline-offset-2 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300";

function splitTrailingPunct(value: string): { core: string; punct: string } {
  const match = value.match(TRAILING_PUNCT);
  if (!match) return { core: value, punct: "" };
  return {
    core: value.slice(0, -match[0].length),
    punct: match[0],
  };
}

function isExternalHttpUrl(href: string): boolean {
  try {
    const host = new URL(href).hostname.replace(/^www\./, "");
    return host !== "billiard.guru" && !host.endsWith(".billiard.guru");
  } catch {
    return true;
  }
}

function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(LINKABLE.source, LINKABLE.flags);

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const raw = match[0];
    if (match[1]) {
      const { core, punct } = splitTrailingPunct(raw);
      const external = isExternalHttpUrl(core);
      nodes.push(
        <a
          key={`${match.index}-url`}
          href={core}
          className={linkClassName}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {core}
        </a>,
      );
      if (punct) nodes.push(punct);
    } else {
      const email = raw;
      nodes.push(
        <a key={`${match.index}-mail`} href={`mailto:${email}`} className={linkClassName}>
          {email}
        </a>,
      );
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

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
                <td key={`${rowIndex}-${cellIndex}`}>{linkifyText(cell)}</td>
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
                {linkifyText(paragraph)}
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
