import type { BilliardHistory, BilliardTableChecklist, BilliardTableEquipment } from "@/lib/billiard-rules/content";
import { GuideSections } from "@/components/site/guide-sections";
import { SiteCard } from "@/components/site/site-card";

export function RulesEquipmentBlock({ equipment }: { equipment: BilliardTableEquipment }) {
  return (
    <SiteCard id="equipment">
      <h2 className="site-section-title text-xl">{equipment.title}</h2>
      {equipment.intro && (
        <p className="guide-body-text mt-3 text-sm leading-relaxed">{equipment.intro}</p>
      )}
      <div className="mt-6 space-y-8">
        {equipment.groups.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{group.title}</h3>
            <div className="guide-table-shell mt-3 overflow-x-auto">
              <table className="guide-table min-w-[480px] text-sm">
                <thead>
                  <tr>
                    {group.table.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className={j === 0 ? "font-medium" : undefined}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      {equipment.note && <p className="guide-note mt-6 text-sm">{equipment.note}</p>}
    </SiteCard>
  );
}

export function RulesChecklistBlock({ checklist }: { checklist: BilliardTableChecklist }) {
  return (
    <SiteCard id="checklist">
      <h2 className="site-section-title text-xl">{checklist.title}</h2>
      {checklist.intro && (
        <p className="guide-body-text mt-3 text-sm leading-relaxed">{checklist.intro}</p>
      )}
      <ul className="rules-checklist mt-5">
        {checklist.items.map((item) => (
          <li key={item.text} className="rules-checklist-item">
            <span className="rules-checklist-box" aria-hidden />
            <div>
              <p className="rules-checklist-label">{item.text}</p>
              {item.hint && (
                <p className="guide-body-text mt-1 text-sm leading-relaxed">{item.hint}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </SiteCard>
  );
}

export function RulesHistoryBlock({
  history,
  id = "history",
}: {
  history: BilliardHistory;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4">
      <div>
        <h2 className="site-section-title text-xl">{history.title}</h2>
        {history.intro && (
          <p className="guide-body-text mt-2 max-w-3xl text-sm leading-relaxed">{history.intro}</p>
        )}
      </div>
      <GuideSections sections={history.sections} />
    </section>
  );
}
