import fs from "node:fs/promises";
import { createConnection, type Connection } from "mariadb";
import { getDatabaseUrlFromEnv, parseDatabaseUrl } from "@/lib/database-url";

function createConnectionConfig() {
  const db = parseDatabaseUrl(getDatabaseUrlFromEnv());
  return {
    db,
    config: {
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.database,
      allowPublicKeyRetrieval: true,
    },
  };
}

function tableNameFromShowRow(row: Record<string, string>): string {
  return Object.values(row)[0] ?? "";
}

function sqlEscape(conn: Connection, value: unknown): string {
  return conn.escape(value) as string;
}

function buildInsertStatements(
  conn: Connection,
  table: string,
  rows: Record<string, unknown>[],
): string[] {
  if (rows.length === 0) return [];

  const columns = Object.keys(rows[0]!);
  const colList = columns.map((c) => `\`${c}\``).join(", ");
  const chunkSize = 100;
  const lines: string[] = [];

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const values = chunk
      .map((row) => {
        const vals = columns.map((col) => sqlEscape(conn, row[col]));
        return `(${vals.join(", ")})`;
      })
      .join(",\n  ");
    lines.push(
      `INSERT INTO \`${table}\` (${colList}) VALUES\n  ${values};`,
    );
  }

  return lines;
}

export async function createSqlDumpViaNode(filePath: string): Promise<void> {
  const { db, config } = createConnectionConfig();
  const conn = await createConnection(config);

  try {
    const lines: string[] = [
      "-- billiard.guru SQL dump (Node.js / mariadb driver)",
      `-- Host: ${db.host} Database: ${db.database}`,
      `-- Dump date: ${new Date().toISOString()}`,
      "SET NAMES utf8mb4;",
      "SET FOREIGN_KEY_CHECKS=0;",
      "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';",
      "",
    ];

    const tables = (await conn.query<Record<string, string>[]>("SHOW TABLES")).map(
      tableNameFromShowRow,
    );

    for (const table of tables) {
      if (!table) continue;
      const createRows = await conn.query<Record<string, string>>(
        `SHOW CREATE TABLE \`${table}\``,
      );
      const createSql = createRows[0]?.["Create Table"];
      if (!createSql) continue;

      lines.push(`DROP TABLE IF EXISTS \`${table}\`;`, `${createSql};`, "");

      const rows = await conn.query<Record<string, unknown>[]>(
        `SELECT * FROM \`${table}\``,
      );
      lines.push(...buildInsertStatements(conn, table, rows), "");
    }

    const triggers = await conn.query<Record<string, string>[]>(
      `SHOW TRIGGERS FROM \`${db.database}\``,
    );
    for (const trigger of triggers) {
      const name = trigger.Trigger;
      if (!name) continue;
      const createRows = await conn.query<Record<string, string>>(
        `SHOW CREATE TRIGGER \`${name}\``,
      );
      const createSql = createRows[0]?.["SQL Original Statement"] ??
        createRows[0]?.["Create Trigger"];
      if (createSql) {
        lines.push(`DROP TRIGGER IF EXISTS \`${name}\`;`, `${createSql};`, "");
      }
    }

    lines.push("SET FOREIGN_KEY_CHECKS=1;", "");
    await fs.writeFile(filePath, lines.join("\n"), "utf8");
  } finally {
    await conn.end();
  }
}

export async function restoreSqlDumpViaNode(filePath: string): Promise<void> {
  const { config } = createConnectionConfig();
  const sql = await fs.readFile(filePath, "utf8");
  const conn = await createConnection({
    ...config,
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
  } finally {
    await conn.end();
  }
}
