import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedDates, bookings, technicianServices, technicians } from "@/db/schema";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { cairoNowParts } from "@/lib/cairoTime";
import { parseId } from "@/lib/validate";
import { getSession } from "@/lib/auth";
import { isValidCategory, isValidSlotType, isValidTime } from "@/lib/validate";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await db.select().from(technicians).where(isNull(technicians.removedAt)).orderBy(technicians.id);
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

  const changed = await db.update(technicians).set(safeUpdates)
    .where(and(eq(technicians.id, id), isNull(technicians.removedAt))).returning({ id: technicians.id });
  if (!changed.length) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

  const updated = await db
    .select()
    .from(technicians)
    .where(eq(technicians.id, id))
    .limit(1);

  return NextResponse.json(updated[0]);
}

/**
 * Permanently removes a technician from the dashboard and the booking flow.
 * Refused while they still have upcoming appointments, which must be
 * reassigned or cancelled first. Past bookings are kept (client history and
 * revenue depend on them), so the row is retired rather than deleted.
 */
export async function DELETE(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseId(new URL(request.url).searchParams.get("id"));
  if (id === null) return NextResponse.json({ error: "Valid technician ID is required" }, { status: 400 });

  const today = cairoNowParts().date;
  try {
    const result = await db.transaction(async (tx) => {
      const rows = await tx.select({ id: technicians.id }).from(technicians)
        .where(and(eq(technicians.id, id), isNull(technicians.removedAt))).limit(1);
      if (!rows.length) return { status: 404, error: "Technician not found" };

      const upcoming = await tx.select({ count: sql<number>`count(*)::int` }).from(bookings)
        .where(and(eq(bookings.technicianId, id), gte(bookings.bookingDate, today), inArray(bookings.status, ["pending_deposit", "confirmed"])));
      const count = upcoming[0]?.count || 0;
      if (count > 0) {
        return { status: 409, error: `This technician still has ${count} upcoming booking${count === 1 ? "" : "s"}. Reassign or cancel ${count === 1 ? "it" : "them"} first.` };
      }

      await tx.delete(blockedDates).where(eq(blockedDates.technicianId, id));
      await tx.delete(technicianServices).where(eq(technicianServices.technicianId, id));
      await tx.update(technicians).set({ active: false, removedAt: new Date() }).where(eq(technicians.id, id));
      return { status: 200 };
    });
    if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Technician removal error:", error);
    return NextResponse.json({ error: "Could not remove technician" }, { status: 500 });
  }
}
