import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function dbHostHint() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "DATABASE_URL not set";
  try {
    return new URL(raw.replace(/^mysql:\/\//, "http://")).hostname;
  } catch {
    return "invalid DATABASE_URL";
  }
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return NextResponse.json({ status: "ok", db: "connected", host: dbHostHint() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return NextResponse.json(
      { status: "error", db: message, host: dbHostHint() },
      { status: 500 },
    );
  }
}
