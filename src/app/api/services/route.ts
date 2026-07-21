import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { parseId } from "@/lib/validate";
import { getAllowedServiceIds } from "@/lib/technicianServices";

export async function GET(request: Request) {
  const technicianId = parseId(new URL(request.url).searchParams.get("technicianId"));
  const rows = await db.select({
    id: services.id,
    name: services.name,
    category: services.category,
    price: services.price,
    priceMax: services.priceMax,
    priceLabel: services.priceLabel,
    duration: services.duration,
  }).from(services).where(eq(services.active, true)).orderBy(asc(services.sortOrder), asc(services.id));

  if (!technicianId) return NextResponse.json(rows);

  const allowed = await getAllowedServiceIds(technicianId);
  if (!allowed) return NextResponse.json(rows);
  return NextResponse.json(rows.filter((row) => row.category === "extras" || allowed.has(row.id)));
}
