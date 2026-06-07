import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getDatabaseUrlFromEnv, parseDatabaseUrl } from "@/lib/database-url";
import type { DbBackupEntry, DbBackupKind, DbBackupSettings } from "@/lib/db-backup-types";

export type { DbBackupEntry, DbBackupKind, DbBackupSettings } from "@/lib/db-backup-types";

const CONFIG_ID = "default";
const BACKUP_FILE_RE = /^[\w-]+\.sql(\.gz)?$/;

function resolveBackupDir(): string {
  if (process.env.DB_BACKUP_DIR) {
    return path.resolve(process.env.DB_BACKUP_DIR);
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "..", "..", "data", "db-backups"),
    path.join(cwd, "..", "..", "..", "data", "db-backups"),
    path.join(cwd, "data", "db-backups"),
  ];
  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (resolved.includes(`${path.sep}setka${path.sep}data`)) {
      return resolved;
    }
  }
  return path.resolve(candidates[0]!);
}

async function ensureBackupDir(): Promise<string> {
  const dir = resolveBackupDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function backupIdFromFilename(filename: string): string {
  return filename.replace(/\.sql(\.gz)?$/, "");
}

function kindFromId(id: string): DbBackupKind {
  return id.endsWith("_auto") ? "auto" : "manual";
}

function formatBackupFilename(kind: DbBackupKind): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "")
    .replace("T", "_");
  return `${stamp}_${kind}.sql`;
}

function runCommand(
  bin: string,
  args: string[],
  env?: Record<string, string | undefined>,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      env: { ...process.env, ...env } as NodeJS.ProcessEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          stderr.trim() || stdout.trim() || `${bin} завершился с кодом ${code}`,
        ),
      );
    });
  });
}

async function commandExists(bin: string): Promise<boolean> {
  try {
    await runCommand("which", [bin]);
    return true;
  } catch {
    return false;
  }
}

function mysqlArgs(db: ReturnType<typeof parseDatabaseUrl>, extra: string[] = []) {
  const args = [
    `--host=${db.host}`,
    `--port=${String(db.port)}`,
    `--user=${db.user}`,
    ...extra,
    db.database,
  ];
  return args;
}

async function createSqlDump(filePath: string): Promise<void> {
  const db = parseDatabaseUrl(getDatabaseUrlFromEnv());
  const args = [
    `--host=${db.host}`,
    `--port=${String(db.port)}`,
    `--user=${db.user}`,
    "--single-transaction",
    "--routines",
    "--triggers",
    "--set-gtid-purged=OFF",
    "--result-file",
    filePath,
    db.database,
  ];
  await runCommand("mysqldump", args, {
    MYSQL_PWD: db.password,
  });
}

async function restoreSqlDump(filePath: string): Promise<void> {
  const db = parseDatabaseUrl(getDatabaseUrlFromEnv());
  const { readFile } = await import("node:fs/promises");
  const sql = await readFile(filePath, "utf8");
  const { spawn: spawnProc } = await import("node:child_process");

  await new Promise<void>((resolve, reject) => {
    const child = spawnProc(
      "mysql",
      mysqlArgs(db),
      {
        env: { ...process.env, MYSQL_PWD: db.password },
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `mysql завершился с кодом ${code}`));
    });
    child.stdin?.write(sql);
    child.stdin?.end();
  });
}

export async function getDbBackupSettings(): Promise<DbBackupSettings> {
  const [row, mysqldumpAvailable, mysqlAvailable] = await Promise.all([
    prisma.dbBackupConfig.findUnique({ where: { id: CONFIG_ID } }),
    commandExists("mysqldump"),
    commandExists("mysql"),
  ]);

  return {
    autoEnabled: row?.autoEnabled ?? false,
    autoIntervalHours: row?.autoIntervalHours ?? 0,
    autoHour: row?.autoHour ?? 3,
    autoMinute: row?.autoMinute ?? 0,
    retainCount: row?.retainCount ?? 14,
    lastAutoBackupAt: row?.lastAutoBackupAt?.toISOString() ?? null,
    backupDir: resolveBackupDir(),
    mysqldumpAvailable,
    mysqlAvailable,
  };
}

export async function saveDbBackupSettings(data: {
  autoEnabled?: boolean;
  autoHour?: number;
  autoMinute?: number;
  retainCount?: number;
}): Promise<DbBackupSettings> {
  await prisma.dbBackupConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      autoEnabled: data.autoEnabled ?? false,
      autoHour: data.autoHour ?? 3,
      autoMinute: data.autoMinute ?? 0,
      retainCount: data.retainCount ?? 14,
    },
    update: {
      ...(data.autoEnabled !== undefined ? { autoEnabled: data.autoEnabled } : {}),
      ...(data.autoHour !== undefined ? { autoHour: data.autoHour } : {}),
      ...(data.autoMinute !== undefined ? { autoMinute: data.autoMinute } : {}),
      ...(data.retainCount !== undefined ? { retainCount: data.retainCount } : {}),
    },
  });
  return getDbBackupSettings();
}

export async function listDbBackups(): Promise<DbBackupEntry[]> {
  const dir = await ensureBackupDir();
  const db = parseDatabaseUrl(getDatabaseUrlFromEnv());
  const names = await fs.readdir(dir);
  const entries: DbBackupEntry[] = [];

  for (const name of names) {
    if (!BACKUP_FILE_RE.test(name)) continue;
    const stat = await fs.stat(path.join(dir, name));
    if (!stat.isFile()) continue;
    const id = backupIdFromFilename(name);
    entries.push({
      id,
      filename: name,
      kind: kindFromId(id),
      sizeBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
      database: db.database,
    });
  }

  return entries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function resolveBackupFile(id: string): Promise<string> {
  if (!/^[\w-]+$/.test(id)) {
    throw new Error("Некорректный идентификатор бэкапа");
  }
  const dir = resolveBackupDir();
  for (const ext of [".sql", ".sql.gz"]) {
    const name = `${id}${ext}`;
    if (!BACKUP_FILE_RE.test(name)) continue;
    const full = path.join(dir, name);
    try {
      await fs.access(full);
      return full;
    } catch {
      // try next
    }
  }
  throw new Error("Бэкап не найден");
}

export async function createDbBackup(kind: DbBackupKind): Promise<DbBackupEntry> {
  const settings = await getDbBackupSettings();
  if (!settings.mysqldumpAvailable) {
    throw new Error(
      "mysqldump не найден в PATH. Установите MySQL client или задайте путь на сервере.",
    );
  }

  const dir = await ensureBackupDir();
  const filename = formatBackupFilename(kind);
  const filePath = path.join(dir, filename);
  await createSqlDump(filePath);
  const stat = await fs.stat(filePath);
  const db = parseDatabaseUrl(getDatabaseUrlFromEnv());

  if (kind === "auto") {
    await prisma.dbBackupConfig.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, lastAutoBackupAt: new Date() },
      update: { lastAutoBackupAt: new Date() },
    });
  }

  await pruneOldBackups(settings.retainCount);

  return {
    id: backupIdFromFilename(filename),
    filename,
    kind,
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
    database: db.database,
  };
}

async function pruneOldBackups(retainCount: number): Promise<void> {
  const backups = await listDbBackups();
  const excess = backups.slice(retainCount);
  for (const item of excess) {
    await deleteDbBackup(item.id);
  }
}

export async function deleteDbBackup(id: string): Promise<void> {
  const filePath = await resolveBackupFile(id);
  await fs.unlink(filePath);
}

export async function getDbBackupFilePath(id: string): Promise<string> {
  return resolveBackupFile(id);
}

export async function restoreDbBackup(id: string): Promise<void> {
  const settings = await getDbBackupSettings();
  if (!settings.mysqlAvailable) {
    throw new Error("mysql не найден в PATH");
  }
  const filePath = await getDbBackupFilePath(id);
  if (filePath.endsWith(".gz")) {
    throw new Error("Восстановление .sql.gz пока не поддерживается");
  }
  await restoreSqlDump(filePath);
}

export function isAutoBackupDue(settings: DbBackupSettings): boolean {
  if (!settings.autoEnabled) return false;

  if (settings.autoIntervalHours > 0) {
    if (!settings.lastAutoBackupAt) return true;
    const elapsedMs =
      Date.now() - new Date(settings.lastAutoBackupAt).getTime();
    return elapsedMs >= settings.autoIntervalHours * 60 * 60 * 1000;
  }

  const now = new Date();
  const slot = new Date(now);
  slot.setHours(settings.autoHour, settings.autoMinute, 0, 0);
  if (now < slot) return false;
  if (!settings.lastAutoBackupAt) return true;
  return new Date(settings.lastAutoBackupAt) < slot;
}

export async function runScheduledDbBackupIfDue(): Promise<{
  ran: boolean;
  backup?: DbBackupEntry;
}> {
  const settings = await getDbBackupSettings();
  if (!isAutoBackupDue(settings)) {
    return { ran: false };
  }
  const backup = await createDbBackup("auto");
  return { ran: true, backup };
}
