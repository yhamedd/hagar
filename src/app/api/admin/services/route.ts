import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { sanitizeText, isValidServiceCategory } from "@/lib/validate";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await db.select().from(services).orderBy(asc(services.sortOrder), asc(services.id)));
}

export async function PUT(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const id = typeof body.id === "number" ? body.id : 0;
  if (!id) return NextResponse.json({ error: "Valid service ID is required" }, { status: 400 });
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.category !== undefined) {
    if (!isValidServiceCategory(body.category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    updates.category = body.category;
  }
  if (typeof body.price === "number" && Number.isInteger(body.price) && body.price >= 0) updates.price = body.price;
  if (body.priceMax === null || (typeof body.priceMax === "number" && Number.isInteger(body.priceMax) && body.priceMax >= 0)) updates.priceMax = body.priceMax;
  if (typeof body.priceLabel === "string" && sanitizeText(body.priceLabel, 100)) updates.priceLabel = sanitizeText(body.priceLabel, 100);
  if (typeof body.duration === "number" && Number.isInteger(body.duration) && body.duration > 0 && body.duration <= 480) updates.duration = body.duration;
  if (typeof body.active === "boolean") updates.active = body.active;
  const rows = await db.update(services).set(updates).where(eq(services.id, id)).returning();
  if (!rows.length) return NextResponse.json({ error: "Service not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
