import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";

export async function GET() {
  const rows = await db.select({
    id: services.id,
    name: services.name,
    category: services.category,
    price: services.price,
    priceMax: services.priceMax,
    priceLabel: services.priceLabel,
    duration: services.duration,
  }).from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder), asc(services.id));
  return NextResponse.json(rows);
}
