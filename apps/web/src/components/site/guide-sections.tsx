import type { GuideExample, GuideSection } from "@/lib/guide-content";
import { SiteCard } from "@/components/site/site-card";

function GuideTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
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
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GuideExampleBlock({ example }: { example: GuideExample }) {
  return (
    <div className="guide-example">
      <h3 className="guide-example-title">{example.title}</h3>
      {example.description && <p className="guide-example-desc">{example.description}</p>}
      {example.table && (
        <GuideTable headers={example.table.headers} rows={example.table.rows} />
      )}
      {example.diagram && <pre className="guide-diagram">{example.diagram}</pre>}
      {example.steps && (
        <ol className="guide-steps">
          {example.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function GuideSections({ sections }: { sections: GuideSection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <SiteCard key={section.id} id={section.id} className="scroll-mt-28">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="site-section-title text-xl">{section.title}</h2>
            {section.format && <span className="guide-format-badge">{section.format}</span>}
          </div>
          {section.paragraphs?.map((text) => (
            <p key={text} className="guide-body-text mt-3 text-sm leading-relaxed">
              {text}
            </p>
          ))}
          {section.bullets && (
            <ul className="guide-body-text mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {section.table && (
            <GuideTable headers={section.table.headers} rows={section.table.rows} />
          )}
          {section.examples?.map((example) => (
            <GuideExampleBlock key={example.title} example={example} />
          ))}
          {section.note && <p className="guide-note">{section.note}</p>}
        </SiteCard>
      ))}
    </div>
  );
}

export function GuideToc({ sections }: { sections: GuideSection[] }) {
  return (
    <nav className="site-card p-5">
      <p className="guide-toc-label">Содержание</p>
      <ul className="mt-3 space-y-2 text-sm">
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} className="guide-toc-link">
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
