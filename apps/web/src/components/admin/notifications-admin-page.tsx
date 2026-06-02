"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchableMultiSelect } from "@/components/ui/searchable-select";
import { AsyncTextButton } from "@/components/ui/async-text-button";
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_KIND_LABELS,
  type NotificationCategory,
  type NotificationKind,
} from "@/lib/notifications/catalog";
import { adminTabClass } from "@/lib/admin-ui";
import { NotificationsDeliveryLogPanel } from "@/components/admin/notifications-delivery-log-panel";
import { cn } from "@/lib/cn";

interface ItemSettings {
  enabled: boolean;
  templateOverride: string | null;
}

interface CatalogItem {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  kind: NotificationKind;
  recipient: string;
  trigger: string;
  implementation: string;
  hasButtons: boolean;
  massBroadcast?: boolean;
  manageable: boolean;
  editableTemplate?: boolean;
  templatePlaceholders?: string[];
  referenceTemplate?: string;
  settings: ItemSettings;
  triggeredByTitles: string[];
  chainsToTitles: string[];
  examplePreview: string;
  defaultTemplate?: string;
  auditCount30d: number | null;
}

function templateForEditor(
  draft: ItemSettings | undefined,
  item: CatalogItem,
): string {
  if (draft?.templateOverride != null && draft.templateOverride !== "") {
    return draft.templateOverride;
  }
  return item.defaultTemplate ?? "";
}

function normalizeTemplateSave(
  text: string,
  defaultTemplate: string | undefined,
): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (defaultTemplate && trimmed === defaultTemplate.trim()) return null;
  return trimmed;
}

function globalSettingsEqual(a: GlobalSettings, b: GlobalSettings): boolean {
  if (a.testModeEnabled !== b.testModeEnabled) return false;
  if (a.testPlayerIds.length !== b.testPlayerIds.length) return false;
  const ids = new Set(b.testPlayerIds);
  return a.testPlayerIds.every((id) => ids.has(id));
}

interface GlobalSettings {
  testModeEnabled: boolean;
  testPlayerIds: string[];
}

interface Payload {
  global: GlobalSettings;
  catalog: CatalogItem[];
  flows: { title: string; steps: { id: string; title: string; kind?: NotificationKind }[] }[];
  telegram: {
    botUsername: string;
    tokenConfigured: boolean;
    webhookUrl: string | null;
    adminIdsEnv: number;
    nearbyRadiusKm: number;
  };
  statsSinceDays: number;
}

interface PlayerOption {
  value: string;
  label: string;
}

const ALL_CATEGORIES = "all" as const;
type CategoryFilter = NotificationCategory | typeof ALL_CATEGORIES;

export function NotificationsAdminPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryFilter>(ALL_CATEGORIES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<"catalog" | "flows" | "delivery">("catalog");
  const [savingGlobal, setSavingGlobal] = useState(false);
  const persistedGlobalRef = useRef<GlobalSettings | null>(null);
  const skipAutosaveRef = useRef(true);
  const [draftGlobal, setDraftGlobal] = useState<GlobalSettings | null>(null);
  const [draftItems, setDraftItems] = useState<Record<string, ItemSettings>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [notifyRes, playersRes] = await Promise.all([
      fetch("/api/admin/notifications"),
      fetch("/api/players"),
    ]);
    const json = await notifyRes.json();
    if (!notifyRes.ok) throw new Error(json.error ?? "Ошибка загрузки");
        setData(json);
    setDraftGlobal(json.global);
    persistedGlobalRef.current = json.global;
    skipAutosaveRef.current = true;
    const items: Record<string, ItemSettings> = {};
    for (const c of json.catalog as CatalogItem[]) {
      items[c.id] = { ...c.settings };
    }
    setDraftItems(items);

    const players = await playersRes.json();
    if (Array.isArray(players)) {
      setPlayerOptions(
        players
          .filter((p: { telegramId?: string | null; isVerified?: boolean }) => p.telegramId && p.isVerified)
          .map((p: { id: string; firstName: string; lastName: string; rating: number }) => ({
            value: p.id,
            label: `${p.lastName} ${p.firstName} · TG ✓`,
          })),
      );
    }
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, [load]);

  const categories = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.catalog.map((n) => n.category))].sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (category === ALL_CATEGORIES) return data.catalog;
    return data.catalog.filter((n) => n.category === category);
  }, [data, category]);

  const massItems = useMemo(
    () => (data ? data.catalog.filter((n) => n.massBroadcast) : []),
    [data],
  );

  const persistGlobal = useCallback(async (global: GlobalSettings) => {
    const baseline = persistedGlobalRef.current;
    if (baseline && globalSettingsEqual(global, baseline)) return;

    setSavingGlobal(true);
    try {
      const res = await fetch("/api/admin/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Ошибка сохранения");
      persistedGlobalRef.current = json.global;
      skipAutosaveRef.current = true;
      setData((prev) => (prev ? { ...prev, global: json.global } : prev));
      setSaveMessage("Тестовый режим сохранён");
      setTimeout(() => setSaveMessage(null), 2500);
    } finally {
      setSavingGlobal(false);
    }
  }, []);

  useEffect(() => {
    if (!draftGlobal) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    const baseline = persistedGlobalRef.current;
    if (baseline && globalSettingsEqual(draftGlobal, baseline)) return;

    const t = window.setTimeout(() => {
      void persistGlobal(draftGlobal);
    }, 600);
    return () => window.clearTimeout(t);
  }, [draftGlobal, persistGlobal]);

  async function saveItem(notificationId: string) {
    const draft = draftItems[notificationId];
    const catalogItem = data?.catalog.find((c) => c.id === notificationId);
    if (!draft || !catalogItem) return;
    const editorText = templateForEditor(draft, catalogItem);
    const res = await fetch("/api/admin/notifications/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item: {
          notificationId,
          enabled: draft.enabled,
          templateOverride: normalizeTemplateSave(
            editorText,
            catalogItem.defaultTemplate,
          ),
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Ошибка сохранения");
    setDraftItems(json.items);
    setSaveMessage("Сохранено");
    setTimeout(() => setSaveMessage(null), 3000);
    await load();
  }

  function updateDraftItem(id: string, patch: Partial<ItemSettings>) {
    setDraftItems((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  if (loading) {
    return <p className="admin-muted text-sm">Загрузка…</p>;
  }

  if (error || !data || !draftGlobal) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Нет данных"}</p>;
  }

  const testModeOn = draftGlobal.testModeEnabled;
  const testRecipientCount = draftGlobal.testPlayerIds.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="admin-page-title mb-2">Уведомления</h1>
        <p className="admin-page-lead max-w-3xl">
          Управление Telegram: шаблоны, вкл/выкл. Массовые рассылки в тестовом режиме не засоряют
          эфир — уходят только выбранным игрокам.
        </p>
      </div>

      {saveMessage && !savingGlobal && (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{saveMessage}</p>
      )}

      <section
        className={cn(
          "admin-card space-y-4 p-5",
          testModeOn && "ring-1 ring-amber-500/40",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="admin-section-title">Тестовый режим рассылок</h2>
            <p className="admin-text-secondary mt-1 max-w-2xl text-sm">
              Пока включён — массовые уведомления не уходят всем игрокам в радиусе / всей базе, а
              только адресатам ниже.
            </p>
          </div>
          {savingGlobal && (
            <span className="admin-muted text-xs" aria-live="polite">
              Сохранение…
            </span>
          )}
        </div>

        {!testModeOn && (
          <div
            className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
            role="status"
          >
            Сейчас тест <strong>выключен</strong> — «Новый турнир рядом» и «Новая идея на сайте»
            уйдут всем подходящим игрокам. Включите тест перед отладкой на живой базе.
          </div>
        )}

        {testModeOn && (
          <div className="admin-notify-test-banner" role="status">
            <strong>Тест включён.</strong>{" "}
            {testRecipientCount > 0
              ? `Массовые рассылки только ${testRecipientCount} выбранным игрокам с Telegram.`
              : "Список игроков пуст — массовые уйдут суперадминам (TELEGRAM_ADMIN_IDS / SUPERADMIN с TG)."}
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="admin-checkbox"
            checked={draftGlobal.testModeEnabled}
            onChange={(e) =>
              setDraftGlobal({ ...draftGlobal, testModeEnabled: e.target.checked })
            }
          />
          <span className="font-medium">Режим тестирования (массовые рассылки)</span>
        </label>

        <div className={cn(!testModeOn && "pointer-events-none opacity-50")}>
          <p className="admin-label mb-2">Кому слать в тесте</p>
          <SearchableMultiSelect
            options={playerOptions}
            values={draftGlobal.testPlayerIds}
            onChange={(ids) => setDraftGlobal({ ...draftGlobal, testPlayerIds: ids })}
            placeholder="Выберите игроков с Telegram"
            searchPlaceholder="Поиск игрока…"
            disabled={!testModeOn}
          />
          <p className="admin-muted mt-2 text-xs">
            Только подтверждённые игроки с привязанным Telegram. Изменения сохраняются
            автоматически.
          </p>
        </div>

        <div>
          <p className="admin-muted mb-2 text-xs uppercase tracking-wide">
            Затрагивает уведомления
          </p>
          <ul className="flex flex-wrap gap-2">
            {massItems.map((n) => (
              <li key={n.id}>
                <span className="admin-notify-chip">{n.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="admin-card p-5">
        <h2 className="admin-muted mb-3 text-sm font-semibold uppercase tracking-wide">
          Telegram
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="admin-muted text-xs">Бот</dt>
            <dd className="font-medium">@{data.telegram.botUsername}</dd>
          </div>
          <div>
            <dt className="admin-muted text-xs">TELEGRAM_BOT_TOKEN</dt>
            <dd>
              <StatusPill ok={data.telegram.tokenConfigured} />
            </dd>
          </div>
          <div>
            <dt className="admin-muted text-xs">Радиус «турнир рядом»</dt>
            <dd>{data.telegram.nearbyRadiusKm} км</dd>
          </div>
        </dl>
      </section>

      <div className="admin-tab-bar">
        <button type="button" className={adminTabClass(view === "catalog")} onClick={() => setView("catalog")}>
          Каталог ({data.catalog.length})
        </button>
        <button type="button" className={adminTabClass(view === "flows")} onClick={() => setView("flows")}>
          Сценарии ({data.flows.length})
        </button>
        <button
          type="button"
          className={adminTabClass(view === "delivery")}
          onClick={() => setView("delivery")}
        >
          Журнал доставки
        </button>
      </div>

      {view === "delivery" && (
        <NotificationsDeliveryLogPanel
          notificationTitles={Object.fromEntries(data.catalog.map((n) => [n.id, n.title]))}
        />
      )}

      {view === "flows" && (
        <div className="space-y-4">
          {data.flows.map((flow) => (
            <div key={flow.title} className="admin-card p-5">
              <h3 className="mb-4 font-semibold">{flow.title}</h3>
              <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {flow.steps.map((step, i) => (
                  <li key={step.id} className="flex items-center gap-2 text-sm">
                    {i > 0 && (
                      <span className="admin-notify-flow-arrow hidden sm:inline" aria-hidden>
                        →
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-lg px-3 py-2",
                        step.kind === "outbound" && "admin-notify-kind--outbound",
                        step.kind === "bot_reply" && "admin-notify-kind--bot_reply",
                        step.kind === "deeplink" && "admin-notify-kind--deeplink",
                      )}
                    >
                      <span className="admin-muted block text-xs">
                        {step.kind ? NOTIFICATION_KIND_LABELS[step.kind] : ""}
                      </span>
                      <span className="font-medium">{step.title}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {view === "catalog" && (
        <>
          <p className="admin-muted text-sm">
            Редактируемый шаблон — только у пунктов с меткой{" "}
            <span className="admin-notify-kind--outbound inline-block rounded px-1.5 py-0.5 text-[10px] font-medium">
              исходящее
            </span>
            . Ответы бота показывают текст для справки (меняется в коде).
          </p>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={category === ALL_CATEGORIES}
              onClick={() => setCategory(ALL_CATEGORIES)}
              label="Все"
            />
            {categories.map((cat) => (
              <FilterChip
                key={cat}
                active={category === cat}
                onClick={() => setCategory(cat)}
                label={NOTIFICATION_CATEGORY_LABELS[cat]}
              />
            ))}
          </div>

          <div className="space-y-2">
            {filtered.map((item) => {
              const open = expandedId === item.id;
              const draft = draftItems[item.id] ?? item.settings;
              const disabled = !draft.enabled;

              return (
                <div
                  key={item.id}
                  className={cn("admin-card overflow-hidden", disabled && "admin-notify-row--disabled")}
                >
                  <button
                    type="button"
                    className="admin-notify-row flex w-full items-start gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedId(open ? null : item.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{item.title}</span>
                        <KindBadge kind={item.kind} />
                        {item.massBroadcast && (
                          <span className="admin-notify-chip">массовая</span>
                        )}
                        {item.hasButtons && <span className="admin-notify-chip">кнопки</span>}
                        {item.editableTemplate && (
                          <span className="admin-notify-chip">шаблон</span>
                        )}
                        {!draft.enabled && (
                          <span className="admin-notify-chip">выкл</span>
                        )}
                        {item.auditCount30d != null && item.auditCount30d > 0 && (
                          <span className="admin-pill--stat text-xs">
                            {item.auditCount30d} в журнале / {data.statsSinceDays} дн.
                          </span>
                        )}
                      </div>
                      <p className="admin-text-secondary mt-1 text-sm">{item.description}</p>
                    </div>
                    <span className="admin-muted shrink-0">{open ? "▲" : "▼"}</span>
                  </button>

                  {open && (
                    <div className="admin-divider space-y-4 border-t px-4 py-4 text-sm">
                      {item.manageable ? (
                        <>
                          <label className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={draft.enabled}
                              onChange={(e) =>
                                updateDraftItem(item.id, { enabled: e.target.checked })
                              }
                              className="admin-checkbox"
                            />
                            <span>Уведомление включено</span>
                          </label>

                          {item.defaultTemplate && (
                            <div>
                              <p className="admin-label mb-1">Шаблон текста (Telegram HTML)</p>
                              {item.templatePlaceholders &&
                                item.templatePlaceholders.length > 0 && (
                                  <p className="admin-muted mb-2 text-xs">
                                    Плейсхолдеры:{" "}
                                    {item.templatePlaceholders.map((p) => `{{${p}}}`).join(", ")}
                                  </p>
                                )}
                              <textarea
                                value={templateForEditor(draft, item)}
                                onChange={(e) =>
                                  updateDraftItem(item.id, {
                                    templateOverride: e.target.value,
                                  })
                                }
                                rows={10}
                                className="admin-input w-full font-mono text-xs leading-relaxed"
                              />
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-secondary text-xs"
                                  onClick={() =>
                                    updateDraftItem(item.id, { templateOverride: null })
                                  }
                                >
                                  Сбросить к умолчанию
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <AsyncTextButton
                              onClick={() => saveItem(item.id)}
                              loadingLabel="Сохранение…"
                              className="admin-btn admin-btn--primary"
                            >
                              Сохранить
                            </AsyncTextButton>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <p className="admin-muted text-sm">
                            {item.kind === "bot_reply"
                              ? "Ответ бота — текст задаётся в коде, здесь только справка. Отключить тип нельзя."
                              : item.kind === "deeplink"
                                ? "Deep link — push с сервера не отправляется."
                                : "Только просмотр."}
                          </p>
                          {(item.referenceTemplate || item.examplePreview) && (
                            <div>
                              <p className="admin-label mb-1">Текст сообщения (справка)</p>
                              <pre className="admin-notify-pre">
                                {item.referenceTemplate ?? item.examplePreview}
                              </pre>
                            </div>
                          )}
                          <p className="admin-code text-xs">{item.implementation}</p>
                        </div>
                      )}

                      <Row label="ID" value={item.id} mono />
                      <Row label="Кому" value={item.recipient} />
                      <Row label="Когда" value={item.trigger} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        ok ? "admin-pill--ok" : "admin-pill--bad",
      )}
    >
      {ok ? "задан" : "не задан"}
    </span>
  );
}

function KindBadge({ kind }: { kind: NotificationKind }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
        kind === "outbound" && "admin-notify-kind--outbound",
        kind === "bot_reply" && "admin-notify-kind--bot_reply",
        kind === "deeplink" && "admin-notify-kind--deeplink",
      )}
    >
      {NOTIFICATION_KIND_LABELS[kind]}
    </span>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("admin-notify-filter", active && "admin-notify-filter--active")}
    >
      {label}
    </button>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
      <span className="admin-muted text-xs">{label}</span>
      <span className={cn(mono && "font-mono text-xs", !mono && "admin-text-secondary")}>
        {value}
      </span>
    </div>
  );
}
