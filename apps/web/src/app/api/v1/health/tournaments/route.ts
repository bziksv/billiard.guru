import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tournamentListInclude } from "@/lib/public-queries";

/** Smoke-test: чтение турниров (та же цепочка, что на главной). */
export async function GET() {
  try {
    const rows = await prisma.tournament.findMany({
      where: { status: { in: ["OPEN", "ACTIVE", "FINISHED"] } },
      include: tournamentListInclude,
      take: 3,
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      status: "ok",
      count: rows.length,
      formats: rows.map((t) => t.format),
    });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
