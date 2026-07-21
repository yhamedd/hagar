import { NextResponse } from "next/server";
import { db } from "@/db";
import { technicians } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { isValidCategory, isValidSlotType, isValidTime } from "@/lib/validate";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await db.select().from(technicians);
  return NextResponse.json(results);
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id } = body;

  if (!id || typeof id !== "number") {
    return NextResponse.json({ error: "Technician ID is required" }, { status: 400 });
  }

  // Whitelist only the fields an admin is allowed to change
  const safeUpdates: Record<string, unknown> = {};

  if (body.name !== undefined && typeof body.name === "string") {
    const name = body.name.trim().slice(0, 100);
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    safeUpdates.name = name;
  }
  if (body.category !== undefined) {
    if (!isValidCategory(body.category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    safeUpdates.category = body.category;
  }
  if (body.slotType !== undefined) {
    if (!isValidSlotType(body.slotType)) {
      return NextResponse.json({ error: "Invalid slot type" }, { status: 400 });
    }
    safeUpdates.slotType = body.slotType;
  }
  if (body.availableDays !== undefined && Array.isArray(body.availableDays)) {
    const days = body.availableDays.filter(
      (d: unknown) => typeof d === "number" && d >= 0 && d <= 6
    );
    safeUpdates.availableDays = days;
  }
  if (body.startTime !== undefined && typeof body.startTime === "string") {
    if (!isValidTime(body.startTime)) return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    safeUpdates.startTime = body.startTime.slice(0, 8);
  }
  if (body.endTime !== undefined && typeof body.endTime === "string") {
    if (!isValidTime(body.endTime)) return NextResponse.json({ error: "Invalid end time" }, { status: 400 });
    safeUpdates.endTime = body.endTime.slice(0, 8);
  }
  if (body.slotInterval !== undefined && typeof body.slotInterval === "number") {
    safeUpdates.slotInterval = Math.max(5, Math.min(480, body.slotInterval));
  }
  if (body.fixedSlots !== undefined && Array.isArray(body.fixedSlots)) {
    safeUpdates.fixedSlots = body.fixedSlots
      .filter((s: unknown) => typeof s === "string")
      .map((s: string) => s.trim().slice(0, 8))
      .filter(isValidTime)
      .slice(0, 50);
  }
  if (typeof body.active === "boolean") {
    safeUpdates.active = body.active;
  }

  if (Object.keys(safeUpdates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.update(technicians).set(safeUpdates).where(eq(technicians.id, id));

  const updated = await db
    .select()
    .from(technicians)
    .where(eq(technicians.id, id))
    .limit(1);

  return NextResponse.json(updated[0]);
}
