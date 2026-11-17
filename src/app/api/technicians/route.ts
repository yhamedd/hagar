import { NextResponse } from "next/server";
import { db } from "@/db";
import { technicians } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { PUBLIC_CATALOG_CACHE } from "@/lib/httpCache";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const results = await db
    .select({
      id: technicians.id,
      name: technicians.name,
      category: technicians.category,
    })
    .from(technicians)
    .where(category ? and(eq(technicians.active, true), eq(technicians.category, category)) : eq(technicians.active, true))
    .orderBy(asc(technicians.id));

  return NextResponse.json(results, { headers: PUBLIC_CATALOG_CACHE });
}
