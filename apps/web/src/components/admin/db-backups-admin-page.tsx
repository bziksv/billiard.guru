"use client";

import { useCallback, useEffect, useState } from "react";
import { AsyncButton } from "@/components/ui/async-text-button";
import {
  describeBackupSchedule,
  formatBytes,
  formatIntervalLabel,
  INTERVAL_MINUTE_OPTIONS,
  type DbBackupCronSetup,
  type DbBackupEntry,
  type DbBackupSettings,
} from "@/lib/db-backup-types";
import { buildDbBackupCronSetup } from "@/lib/db-backup-cron-hint";

type ScheduleMode = "daily" | "interval";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kindLabel(kind: DbBackupEntry["kind"]): string {
  return kind === "auto" ? "Авто" : "Вручную";
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function CronSetupBlock({
  setup,
  secretConfigured,
}: {
  setup: DbBackupCronSetup;
  secretConfigured: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function handleCopy(label: string, text: string) {
    await copyText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mt-5 space-y-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-inset-bg)] p-4">
      <div>
        <h3 className="text-sm font-semibold">Cron на сервере (Beget / SSH)</h3>
        <p className="admin-muted mt-1 text-sm">{setup.note}</p>
        <p className="admin-muted mt-2 text-sm">
          Секрет <strong className="font-medium">не</strong> вставляется в crontab — он лежит в{" "}
          <code className="text-xs">.env</code>, скрипт читает его сам при каждом запуске.
        </p>
      </div>

      {!setup.scriptExists && (
        <p className="admin-error-panel text-sm">
          Скрипт не найден: <span className="font-mono text-xs">{setup.cronScriptPath}</span>.
          Проверьте деплой (<code className="text-xs">git pull</code>) или задайте{" "}
          <code className="text-xs">SETKA_REPO_ROOT</code> в .env.
        </p>
      )}

      <ol className="list-decimal space-y-4 pl-5 text-sm">
        <li>
          <p className="admin-label-xs mb-2">Секрет в .env (один раз)</p>
          {secretConfigured ? (
            <p className="admin-muted text-sm">
              <code className="text-xs">DB_BACKUP_CRON_SECRET</code> задан в{" "}
              <span className="font-mono text-xs">{setup.envFilePath}</span>
            </p>
          ) : (
            <>
              <p className="admin-muted mb-2 text-sm">
                Сгенерируйте на сервере:{" "}
                <code className="text-xs">{setup.generateSecretCommand}</code>
              </p>
              <pre className="admin-notify-pre overflow-x-auto rounded-lg p-3 text-xs">
                {setup.envSecretLine}
              </pre>
              <p className="admin-muted mt-1 text-xs">
                Добавьте строку в{" "}
                <span className="font-mono">{setup.envFilePath}</span>, затем перезапустите
                приложение (Passenger).
              </p>
              <button
                type="button"
                className="admin-btn admin-btn--outline mt-2 px-3 py-1.5 text-xs"
                onClick={() => void handleCopy("env", setup.envSecretLine)}
              >
                {copied === "env" ? "Скопировано" : "Копировать шаблон для .env"}
              </button>
            </>
          )}
        </li>

        <li>
          <p className="admin-label-xs mb-2">Строка в crontab</p>
          <p className="admin-muted mb-2 text-xs">
            Панель Beget → Cron → <code className="text-xs">crontab -e</code>
          </p>
          <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="admin-label-xs">Корень setka</dt>
              <dd className="mt-1 font-mono text-xs break-all">{setup.repoRoot}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="admin-label-xs">Скрипт</dt>
              <dd className="mt-1 font-mono text-xs break-all">{setup.cronScriptPath}</dd>
            </div>
            <div>
              <dt className="admin-label-xs">Лог</dt>
              <dd className="mt-1 font-mono text-xs break-all">{setup.logPath}</dd>
            </div>
            <div>
              <dt className="admin-label-xs">Расписание cron</dt>
              <dd className="mt-1 font-mono text-xs">{setup.cronExpression}</dd>
            </div>
          </dl>
          <pre className="admin-notify-pre overflow-x-auto rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap">
            {setup.cronLine}
          </pre>
          <button
            type="button"
            className="admin-btn admin-btn--outline mt-2 px-3 py-1.5 text-xs"
            onClick={() => void handleCopy("cron", setup.cronLine)}
            disabled={setup.cronExpression === "—"}
          >
            {copied === "cron" ? "Скопировано" : "Копировать строку cron"}
          </button>
        </li>

        <li>
          <p className="admin-label-xs mb-2">Проверка вручную (SSH)</p>
          <pre className="admin-notify-pre overflow-x-auto rounded-lg p-3 text-xs">
            {`chmod +x ${setup.cronScriptPath}\n${setup.testCommand}`}
          </pre>
          <button
            type="button"
            className="admin-btn admin-btn--outline mt-2 px-3 py-1.5 text-xs"
            onClick={() =>
              void handleCopy(
                "test",
                `chmod +x ${setup.cronScriptPath}\n${setup.testCommand}`,
              )
            }
          >
            {copied === "test" ? "Скопировано" : "Копировать команды проверки"}
          </button>
        </li>
      </ol>
    </div>
  );
}

export function DbBackupsAdminPage() {
  const [backups, setBackups] = useState<DbBackupEntry[]>([]);
  const [settings, setSettings] = useState<DbBackupSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [draftAutoEnabled, setDraftAutoEnabled] = useState(false);
  const [draftScheduleMode, setDraftScheduleMode] = useState<ScheduleMode>("daily");
  const [draftIntervalMinutes, setDraftIntervalMinutes] = useState(60);
  const [draftHour, setDraftHour] = useState(3);
  const [draftMinute, setDraftMinute] = useState(0);
  const [draftRetain, setDraftRetain] = useState(14);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/admin/db-backups");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось загрузить данные");
    }
    setBackups(data.backups);
    setSettings(data.settings);
    setDraftAutoEnabled(data.settings.autoEnabled);
    const interval = data.settings.autoIntervalMinutes ?? 0;
    setDraftScheduleMode(interval > 0 ? "interval" : "daily");
    setDraftIntervalMinutes(interval > 0 ? interval : 60);
    setDraftHour(data.settings.autoHour);
    setDraftMinute(data.settings.autoMinute);
    setDraftRetain(data.settings.retainCount);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [load]);

  async function createBackup() {
    setMessage(null);
    setError(null);
    const res = await fetch("/api/admin/db-backups", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось создать бэкап");
    }
    setBackups(data.backups);
    setSettings(data.settings);
    setMessage(`Создан бэкап ${data.backup.filename}`);
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/db-backups/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          autoEnabled: draftAutoEnabled,
          autoIntervalMinutes:
            draftScheduleMode === "interval" ? draftIntervalMinutes : 0,
          autoHour: draftHour,
          autoMinute: draftMinute,
          retainCount: draftRetain,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось сохранить настройки");
      }
      setSettings(data.settings);
      setMessage("Настройки автобэкапа сохранены");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function deleteBackup(id: string) {
    if (!window.confirm("Удалить этот бэкап?")) return;
    setError(null);
    const res = await fetch(`/api/admin/db-backups/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось удалить");
    }
    setBackups(data.backups);
    setMessage("Бэкап удалён");
  }

  async function restoreBackup(id: string) {
    setError(null);
    const res = await fetch(
      `/api/admin/db-backups/${encodeURIComponent(id)}/restore`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESTORE" }),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Не удалось восстановить");
    }
    setRestoreId(null);
    setMessage(data.message ?? "База восстановлена");
  }

  if (loading) {
    return <p className="admin-muted p-6">Загрузка…</p>;
  }

  const toolsOk = settings?.mysqldumpAvailable && settings?.mysqlAvailable;

  const draftCronSetup =
    settings &&
    buildDbBackupCronSetup(
      {
        repoRoot: settings.cronSetup.repoRoot,
        envFilePath: settings.cronSetup.envFilePath,
        cronScriptPath: settings.cronSetup.cronScriptPath,
        logPath: settings.cronSetup.logPath,
        scriptExists: settings.cronSetup.scriptExists,
      },
      {
        autoEnabled: draftAutoEnabled,
        autoIntervalMinutes:
          draftScheduleMode === "interval" ? draftIntervalMinutes : 0,
        autoHour: draftHour,
        autoMinute: draftMinute,
      },
      settings.cronSetup.cronSecretConfigured,
    );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="admin-page-title text-xl font-semibold">Бэкап базы данных</h1>
          <p className="admin-muted mt-1 max-w-2xl text-sm">
            Резервные копии MySQL: создание, скачивание, восстановление и расписание.
          </p>
        </div>
        <AsyncButton
          onClick={() =>
            createBackup().catch((e) =>
              setError(e instanceof Error ? e.message : "Не удалось создать бэкап"),
            )
          }
          className="admin-btn admin-btn--primary px-4 py-2 text-sm"
          loadingLabel="Создание…"
        >
          Создать бэкап сейчас
        </AsyncButton>
      </div>

      {error && (
        <p className="admin-error-panel" role="alert">
          {error}
        </p>
      )}
      {message && <p className="admin-success-panel">{message}</p>}

      <section className="admin-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Состояние</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div>
            <dt className="admin-label-xs">Каталог бэкапов</dt>
            <dd className="mt-1 font-mono text-xs leading-relaxed break-all">
              {settings?.backupDir}
            </dd>
          </div>
          <div>
            <dt className="admin-label-xs">Инструменты</dt>
            <dd className="mt-1">
              mysqldump: {settings?.mysqldumpAvailable ? "✓" : "✗"} · mysql:{" "}
              {settings?.mysqlAvailable ? "✓" : "✗"}
              {!settings?.mysqldumpAvailable && (
                <span className="admin-muted block text-xs">
                  без CLI — дамп через Node.js (mariadb driver)
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="admin-label-xs">Расписание</dt>
            <dd className="mt-1">
              {settings
                ? settings.autoEnabled
                  ? describeBackupSchedule(settings)
                  : "выключено"
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="admin-label-xs">Последний автобэкап</dt>
            <dd className="mt-1">
              {settings?.lastAutoBackupAt
                ? formatDateTime(settings.lastAutoBackupAt)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="admin-label-xs">Всего копий</dt>
            <dd className="mt-1">{backups.length}</dd>
          </div>
        </dl>
        {!toolsOk && (
          <p className="mt-4 text-sm text-amber-600 dark:text-amber-400/90">
            Клиенты MySQL в PATH не найдены — бэкап выполняется через Node.js (тот же драйвер,
            что и Prisma). Для Beget можно также установить{" "}
            <code className="text-xs">mariadb</code> или{" "}
            <code className="text-xs">mysql-client@8.4</code> и задать{" "}
            <code className="text-xs">DB_BACKUP_MYSQLDUMP</code> в .env.
          </p>
        )}
      </section>

      <section className="admin-card p-5">
        <h2 className="mb-2 text-sm font-semibold">Автоматический бэкап</h2>
        <p className="admin-muted mb-4 text-sm">
          Расписание хранится в БД; cron на сервере только периодически вызывает API. Ниже —
          готовая строка для crontab с путями этого сервера.
        </p>

        <label className="mb-4 flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="admin-checkbox h-4 w-4"
            checked={draftAutoEnabled}
            onChange={(e) => setDraftAutoEnabled(e.target.checked)}
          />
          <span>Включить автобэкап</span>
        </label>

        <div className="mb-4 flex flex-wrap gap-4">
          <label>
            <span className="admin-label-xs">Режим</span>
            <select
              value={draftScheduleMode}
              onChange={(e) => setDraftScheduleMode(e.target.value as ScheduleMode)}
              className="admin-input mt-1 block w-44 px-3 py-2 text-sm"
            >
              <option value="daily">Раз в сутки</option>
              <option value="interval">Интервал</option>
            </select>
          </label>
          {draftScheduleMode === "daily" ? (
            <>
              <label>
                <span className="admin-label-xs">Час (0–23)</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={draftHour}
                  onChange={(e) => setDraftHour(Number(e.target.value))}
                  className="admin-input mt-1 block w-24 px-3 py-2 text-sm"
                />
              </label>
              <label>
                <span className="admin-label-xs">Минута (0–59)</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={draftMinute}
                  onChange={(e) => setDraftMinute(Number(e.target.value))}
                  className="admin-input mt-1 block w-24 px-3 py-2 text-sm"
                />
              </label>
            </>
          ) : (
            <label>
              <span className="admin-label-xs">Каждые</span>
              <select
                value={draftIntervalMinutes}
                onChange={(e) => setDraftIntervalMinutes(Number(e.target.value))}
                className="admin-input mt-1 block w-44 px-3 py-2 text-sm"
              >
                {INTERVAL_MINUTE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {formatIntervalLabel(m)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <label>
            <span className="admin-label-xs">Хранить копий</span>
            <input
              type="number"
              min={1}
              max={100}
              value={draftRetain}
              onChange={(e) => setDraftRetain(Number(e.target.value))}
              className="admin-input mt-1 block w-28 px-3 py-2 text-sm"
            />
          </label>
          <AsyncButton
            onClick={() =>
              saveSchedule().catch((e) =>
                setError(e instanceof Error ? e.message : "Ошибка сохранения"),
              )
            }
            disabled={savingSchedule}
            className="admin-btn admin-btn--primary px-4 py-2 text-sm"
            loadingLabel="Сохранение…"
          >
            Сохранить расписание
          </AsyncButton>
        </div>

        {draftCronSetup && (
          <CronSetupBlock
            setup={draftCronSetup}
            secretConfigured={draftCronSetup.cronSecretConfigured}
          />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">Архив бэкапов</h2>
        {backups.length === 0 ? (
          <div className="admin-card px-5 py-10 text-center">
            <p className="admin-muted text-sm">
              Пока нет резервных копий. Создайте первую вручную или включите автобэкап.
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap admin-table-wrap--scroll">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="admin-thead">
                <tr>
                  <th className="px-4 py-3 font-medium">Дата</th>
                  <th className="px-4 py-3 font-medium">Тип</th>
                  <th className="px-4 py-3 font-medium">Файл</th>
                  <th className="px-4 py-3 font-medium">Размер</th>
                  <th className="px-4 py-3 font-medium">БД</th>
                  <th className="px-4 py-3 text-right font-medium">Действия</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((b) => (
                  <tr key={b.id} className="admin-table-row">
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDateTime(b.createdAt)}
                    </td>
                    <td className="px-4 py-3">{kindLabel(b.kind)}</td>
                    <td
                      className="max-w-[220px] truncate px-4 py-3 font-mono text-xs"
                      title={b.filename}
                    >
                      {b.filename}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={b.sizeBytes === 0 ? "text-amber-600" : undefined}>
                        {formatBytes(b.sizeBytes)}
                      </span>
                      {b.sizeBytes === 0 && (
                        <span className="admin-muted ml-1 text-xs">пустой</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{b.database}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex flex-nowrap justify-end gap-2">
                        <a
                          href={`/api/admin/db-backups/${encodeURIComponent(b.id)}/download`}
                          className="admin-btn admin-btn--outline text-xs"
                        >
                          Скачать
                        </a>
                        <button
                          type="button"
                          className="admin-btn admin-btn--outline text-xs"
                          onClick={() => setRestoreId(b.id)}
                        >
                          Восстановить
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--danger text-xs"
                          onClick={() =>
                            deleteBackup(b.id).catch((e) =>
                              setError(e instanceof Error ? e.message : "Ошибка удаления"),
                            )
                          }
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {restoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="admin-card w-full max-w-md space-y-4 p-6">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-300">
              Восстановить базу?
            </h3>
            <p className="text-sm text-[var(--admin-text-secondary)]">
              Текущие данные будут перезаписаны содержимым бэкапа{" "}
              <span className="font-mono text-xs">{restoreId}</span>. Сайт может кратковременно
              работать нестабильно.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="admin-btn admin-btn--outline px-4 py-2 text-sm"
                onClick={() => setRestoreId(null)}
              >
                Отмена
              </button>
              <AsyncButton
                onClick={() =>
                  restoreBackup(restoreId).catch((e) =>
                    setError(e instanceof Error ? e.message : "Не удалось восстановить"),
                  )
                }
                className="admin-btn admin-btn--danger px-4 py-2 text-sm"
                loadingLabel="Восстановление…"
              >
                Да, восстановить
              </AsyncButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
