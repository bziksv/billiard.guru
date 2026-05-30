import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const countries = await prisma.country.findMany({
    include: {
      cities: { orderBy: { nameRu: "asc" } },
    },
    orderBy: { nameRu: "asc" },
  });
  return NextResponse.json(countries);
}
