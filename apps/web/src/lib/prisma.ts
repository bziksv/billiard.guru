import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { ensureDatabaseUrlFromEnvFile } from "@/lib/ensure-database-url";

ensureDatabaseUrlFromEnvFile();

function parseDatabaseUrl(raw: string) {
  const normalized = raw.replace(/^mysql:\/\//, "mariadb://");
  const url = new URL(normalized);
  const host = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    connectTimeout: 15_000,
  };
}

function createPrismaClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaMariaDb(parseDatabaseUrl(raw));
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { createPrismaClient };
