import { NextResponse } from "next/server";
import { db } from "@/db";
import { technicians } from "@/db/schema";
import { eq } from "drizzle-orm";

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
    .where(eq(technicians.active, true));

  const filtered = category
    ? results.filter((t) => t.category === category)
    : results;

  return NextResponse.json(filtered);
}
