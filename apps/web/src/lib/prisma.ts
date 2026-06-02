import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { ensureDatabaseUrlFromEnvFile } from "@/lib/ensure-database-url";

ensureDatabaseUrlFromEnvFile();

function parseDatabaseUrl(raw: string) {
  const normalized = raw.replace(/^mysql:\/\//, "mariadb://");
  const url = new URL(normalized);
  // Beget: localhost = Unix socket; 127.0.0.1 = TCP (часто недоступен из Passenger)
  const host = url.hostname;
  return {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    connectTimeout: 10_000,
    allowPublicKeyRetrieval: true,
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

function isPrismaClientStale(client: PrismaClient): boolean {
  const c = client as PrismaClient & {
    idea?: { findMany?: unknown };
    bracketFormatConfig?: { findMany?: unknown };
  };
  return (
    typeof c.idea?.findMany !== "function" ||
    typeof c.bracketFormatConfig?.findMany !== "function"
  );
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && !isPrismaClientStale(cached)) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();

export { createPrismaClient };
