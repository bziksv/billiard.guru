import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getDatabaseUrlFromEnv, parseDatabaseUrl } from "@/lib/database-url";
import {
  createSqlDumpViaNode,
  restoreSqlDumpViaNode,
} from "@/lib/db-backup-node";
import type { DbBackupEntry, DbBackupKind, DbBackupSettings } from "@/lib/db-backup-types";
import { normalizeIntervalFromDb } from "@/lib/db-backup-types";
import { buildDbBackupCronSetup } from "@/lib/db-backup-cron-hint";

export type { DbBackupEntry, DbBackupKind, DbBackupSettings } from "@/lib/db-backup-types";

const CONFIG_ID = "default";
const BACKUP_FILE_RE = /^[\w-]+\.sql(\.gz)?$/;

/** Git-репозиторий setka (не ~/billiard.guru/current release). */
function resolveRepoRootSync(): string {
  const fromEnv = process.env.SETKA_REPO_ROOT?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }

  const cwd = path.resolve(process.cwd());
  const home = process.env.HOME?.trim();

  const candidates: string[] = [];

  if (home) {
    candidates.push(path.join(home, "setka"));
    if (!home.endsWith(`${path.sep}setka`)) {
      candidates.push(path.join(home, "billiard.guru", "setka"));
    }
  }

  const currentIdx = cwd.indexOf(`${path.sep}current${path.sep}`);
  if (currentIdx >= 0) {
    candidates.push(path.join(cwd.slice(0, currentIdx), "setka"));
  }

  const setkaIdx = cwd.indexOf(`${path.sep}setka${path.sep}`);
  if (setkaIdx >= 0) {
    candidates.push(cwd.slice(0, setkaIdx + `${path.sep}setka`.length));
  }

  let dir = cwd;
  for (let depth = 0; depth < 12; depth++) {
    candidates.push(dir);
    if (dir.endsWith(`${path.sep}billiard.guru`)) {
      candidates.push(path.join(dir, "setka"));
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const seen = new Set<string>();
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (resolved.endsWith(`${path.sep}setka`) || resolved.endsWith("/setka")) {
      return resolved;
    }
  }

  if (home?.includes("billiard.guru")) {
    return path.join(home, "setka");
  }
  if (home) {
    return path.join(home, "billiard.guru", "setka");
  }

  return path.resolve(cwd, "..", "..", "..");
}

async function resolveRepoRoot(): Promise<string> {
  const preferred = resolveRepoRootSync();
  try {
    await fs.access(path.join(preferred, "scripts", "db-backup-cron.sh"), fs.constants.R_OK);
    return preferred;
  } catch {
    // fall through
  }

  let dir = path.resolve(process.cwd());
  for (let depth = 0; depth < 12; depth++) {
    const scriptPath = path.join(dir, "scripts", "db-backup-cron.sh");
    try {
      await fs.access(scriptPath, fs.constants.R_OK);
      return dir;
    } catch {
      // not here
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return preferred;
}

/** Единый каталог для новых бэкапов (из .env или setka/data/db-backups). */
function canonicalBackupDir(): string {
  const fromEnv = process.env.DB_BACKUP_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.join(resolveRepoRootSync(), "data", "db-backups");
}

async function discoverLegacyBackupDirs(): Promise<string[]> {
  const repoRoot = resolveRepoRootSync();
  const siteRoot = path.dirname(repoRoot);
  const cwd = path.resolve(process.cwd());
  const canonical = canonicalBackupDir();

  const candidates = [
    path.join(cwd, "data", "db-backups"),
    path.join(cwd, "..", "..", "data", "db-backups"),
    path.join(cwd, "..", "..", "..", "data", "db-backups"),
    path.join(repoRoot, "apps", "web", ".next", "standalone", "data", "db-backups"),
  ];

  const releasesRoot = path.join(siteRoot, "releases");
  try {
    const names = await fs.readdir(releasesRoot);
    for (const name of names) {
      candidates.push(path.join(releasesRoot, name, "data", "db-backups"));
    }
  } catch {
    // no releases dir
  }

  const seen = new Set<string>([canonical]);
  const unique: string[] = [];
  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    unique.push(resolved);
  }
  return unique;
}

/** Перенос .sql из старых каталогов (releases/current) в canonical. */
export async function migrateBackupsToCanonical(): Promise<number> {
  const canonical = canonicalBackupDir();
  await fs.mkdir(canonical, { recursive: true });

  let copied = 0;
  for (const dir of await discoverLegacyBackupDirs()) {
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!BACKUP_FILE_RE.test(name)) continue;
      const src = path.join(dir, name);
      const dest = path.join(canonical, name);
      try {
        const st = await fs.stat(src);
        if (!st.isFile()) continue;
        await fs.access(dest);
        continue;
      } catch {
        // dest missing — copy
      }
      try {
        await fs.copyFile(src, dest);
        copied++;
      } catch {
        // permissions or disk
      }
    }
  }
  return copied;
}

function resolveCronLogPath(repoRoot: string): string {
  const siteRoot = path.dirname(repoRoot);
  return path.join(siteRoot, "db-backup-cron.log");
}

async function ensureBackupDir(): Promise<string> {
  const dir = canonicalBackupDir();
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

async function binaryAvailable(bin: string): Promise<boolean> {
  if (bin.includes("/")) {
    try {
      await fs.access(bin, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
  return commandExists(bin);
}

const DUMP_BINARY_CANDIDATES = [
  () => process.env.DB_BACKUP_MYSQLDUMP?.trim(),
  () => "mariadb-dump",
  () => "/opt/homebrew/opt/mariadb/bin/mariadb-dump",
  () => "/opt/homebrew/opt/mysql-client@8.4/bin/mysqldump",
  () => "/opt/homebrew/opt/mysql-client@8.0/bin/mysqldump",
  () => "mysqldump",
] as const;

const MYSQL_BINARY_CANDIDATES = [
  () => process.env.DB_BACKUP_MYSQL?.trim(),
  () => "mariadb",
  () => "/opt/homebrew/opt/mariadb/bin/mariadb",
  () => "/opt/homebrew/opt/mysql-client@8.4/bin/mysql",
  () => "/opt/homebrew/opt/mysql-client@8.0/bin/mysql",
  () => "mysql",
] as const;

async function resolveBinary(
  candidates: readonly (() => string | undefined)[],
): Promise<string | null> {
  for (const pick of candidates) {
    const bin = pick();
    if (bin && (await binaryAvailable(bin))) {
      return bin;
    }
  }
  return null;
}

async function readCliVersion(bin: string): Promise<string> {
  const { stdout } = await runCommand(bin, ["--version"]);
  return stdout.trim();
}

/** MySQL 8.4+/9.x CLI на Mac часто не грузит mysql_native_password (Beget, Docker 8.x). */
function isIncompatibleMysqlCliVersion(version: string, bin: string): boolean {
  if (bin.includes("mariadb")) return false;
  if (bin.includes("mysql-client@8.0") || bin.includes("mysql-client@8.4")) {
    return false;
  }
  if (process.env.DB_BACKUP_MYSQLDUMP && bin === process.env.DB_BACKUP_MYSQLDUMP.trim()) {
    return false;
  }
  if (process.env.DB_BACKUP_MYSQL && bin === process.env.DB_BACKUP_MYSQL.trim()) {
    return false;
  }
  return /Ver (9\.|8\.[4-9]\.)/.test(version);
}

function isAuthPluginError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("mysql_native_password") ||
    message.includes("Authentication plugin") ||
    message.includes("2059")
  );
}

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore
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

async function createSqlDumpViaCli(filePath: string, dumpBin: string): Promise<void> {
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
  await runCommand(dumpBin, args, {
    MYSQL_PWD: db.password,
  });
}

async function createSqlDump(filePath: string): Promise<void> {
  const dumpBin = await resolveBinary(DUMP_BINARY_CANDIDATES);
  if (dumpBin) {
    const version = await readCliVersion(dumpBin).catch(() => "");
    if (!isIncompatibleMysqlCliVersion(version, dumpBin)) {
      try {
        await createSqlDumpViaCli(filePath, dumpBin);
        const stat = await fs.stat(filePath);
        if (stat.size > 0) return;
        await unlinkIfExists(filePath);
      } catch (error) {
        await unlinkIfExists(filePath);
        if (!isAuthPluginError(error)) throw error;
      }
    }
  }

  await createSqlDumpViaNode(filePath);
  const stat = await fs.stat(filePath);
  if (stat.size === 0) {
    await unlinkIfExists(filePath);
    throw new Error("Бэкап пустой — проверьте DATABASE_URL и доступ к БД");
  }
}

async function restoreSqlDumpViaCli(filePath: string, mysqlBin: string): Promise<void> {
  const db = parseDatabaseUrl(getDatabaseUrlFromEnv());
  const { readFile } = await import("node:fs/promises");
  const sql = await readFile(filePath, "utf8");
  const { spawn: spawnProc } = await import("node:child_process");

  await new Promise<void>((resolve, reject) => {
    const child = spawnProc(
      mysqlBin,
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
      else reject(new Error(stderr.trim() || `${mysqlBin} завершился с кодом ${code}`));
    });
    child.stdin?.write(sql);
    child.stdin?.end();
  });
}

async function restoreSqlDump(filePath: string): Promise<void> {
  const mysqlBin = await resolveBinary(MYSQL_BINARY_CANDIDATES);
  if (mysqlBin) {
    const version = await readCliVersion(mysqlBin).catch(() => "");
    if (!isIncompatibleMysqlCliVersion(version, mysqlBin)) {
      try {
        await restoreSqlDumpViaCli(filePath, mysqlBin);
        return;
      } catch (error) {
        if (!isAuthPluginError(error)) throw error;
      }
    }
  }

  await restoreSqlDumpViaNode(filePath);
}

export async function getDbBackupSettings(): Promise<DbBackupSettings> {
  await migrateBackupsToCanonical();

  const [row, dumpBin, mysqlBin, repoRoot] = await Promise.all([
    prisma.dbBackupConfig.findUnique({ where: { id: CONFIG_ID } }),
    resolveBinary(DUMP_BINARY_CANDIDATES),
    resolveBinary(MYSQL_BINARY_CANDIDATES),
    resolveRepoRoot(),
  ]);

  const schedule = {
    autoEnabled: row?.autoEnabled ?? false,
    autoIntervalMinutes: normalizeIntervalFromDb(row?.autoIntervalHours ?? 0),
    autoHour: row?.autoHour ?? 3,
    autoMinute: row?.autoMinute ?? 0,
  };

  const cronScriptPath = path.join(repoRoot, "scripts", "db-backup-cron.sh");
  const cronPhpScriptPath = path.join(repoRoot, "scripts", "db-backup-cron.php");
  let scriptExists = false;
  let phpScriptExists = false;
  try {
    await fs.access(cronScriptPath, fs.constants.R_OK);
    scriptExists = true;
  } catch {
    scriptExists = false;
  }
  try {
    await fs.access(cronPhpScriptPath, fs.constants.R_OK);
    phpScriptExists = true;
  } catch {
    phpScriptExists = false;
  }

  return {
    ...schedule,
    retainCount: row?.retainCount ?? 14,
    lastAutoBackupAt: row?.lastAutoBackupAt?.toISOString() ?? null,
    backupDir: canonicalBackupDir(),
    mysqldumpAvailable: Boolean(dumpBin),
    mysqlAvailable: Boolean(mysqlBin),
    cronSetup: buildDbBackupCronSetup(
      {
        repoRoot,
        envFilePath: path.join(repoRoot, "apps", "web", ".env"),
        cronScriptPath,
        cronPhpScriptPath,
        logPath: resolveCronLogPath(repoRoot),
        scriptExists,
        phpScriptExists,
      },
      schedule,
      Boolean(process.env.DB_BACKUP_CRON_SECRET?.trim()),
    ),
  };
}

export async function saveDbBackupSettings(data: {
  autoEnabled?: boolean;
  autoIntervalMinutes?: number;
  autoHour?: number;
  autoMinute?: number;
  retainCount?: number;
}): Promise<DbBackupSettings> {
  await prisma.dbBackupConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      autoEnabled: data.autoEnabled ?? false,
      autoIntervalHours: data.autoIntervalMinutes ?? 0,
      autoHour: data.autoHour ?? 3,
      autoMinute: data.autoMinute ?? 0,
      retainCount: data.retainCount ?? 14,
    },
    update: {
      ...(data.autoEnabled !== undefined ? { autoEnabled: data.autoEnabled } : {}),
      ...(data.autoIntervalMinutes !== undefined
        ? { autoIntervalHours: data.autoIntervalMinutes }
        : {}),
      ...(data.autoHour !== undefined ? { autoHour: data.autoHour } : {}),
      ...(data.autoMinute !== undefined ? { autoMinute: data.autoMinute } : {}),
      ...(data.retainCount !== undefined ? { retainCount: data.retainCount } : {}),
    },
  });
  return getDbBackupSettings();
}

export async function listDbBackups(): Promise<DbBackupEntry[]> {
  await migrateBackupsToCanonical();
  const dir = canonicalBackupDir();
  const db = parseDatabaseUrl(getDatabaseUrlFromEnv());
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
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
  await migrateBackupsToCanonical();
  const dirs = [canonicalBackupDir(), ...(await discoverLegacyBackupDirs())];
  for (const dir of dirs) {
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
  }
  throw new Error("Бэкап не найден");
}

export async function createDbBackup(kind: DbBackupKind): Promise<DbBackupEntry> {
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

  const settings = await getDbBackupSettings();
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
  const filePath = await getDbBackupFilePath(id);
  if (filePath.endsWith(".gz")) {
    throw new Error("Восстановление .sql.gz пока не поддерживается");
  }
  await restoreSqlDump(filePath);
}

export function isAutoBackupDue(settings: DbBackupSettings): boolean {
  if (!settings.autoEnabled) return false;

  if (settings.autoIntervalMinutes > 0) {
    if (!settings.lastAutoBackupAt) return true;
    const elapsedMs =
      Date.now() - new Date(settings.lastAutoBackupAt).getTime();
    return elapsedMs >= settings.autoIntervalMinutes * 60 * 1000;
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
