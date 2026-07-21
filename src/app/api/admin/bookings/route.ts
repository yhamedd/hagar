import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedDates, bookings, clients, services, technicians } from "@/db/schema";
import { and, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { cleanupStaleBookings } from "@/lib/cleanupBookings";
import { generateTimeSlots, isDayAvailable } from "@/lib/slots";
import { appointmentFitsSchedule, hasBookingConflict } from "@/lib/bookingConflicts";
import { isValidBookingStatus, isValidDate, isValidTime, normalizePhone, sanitizePhone, sanitizeText } from "@/lib/validate";
import { isUniqueViolation } from "@/lib/dbErrors";

export async function GET(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await cleanupStaleBookings();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(searchParams.get("pageSize") || "25", 10) || 25));
  const status = sanitizeText(searchParams.get("status"), 30);
  const technicianId = Number.parseInt(searchParams.get("technicianId") || "0", 10) || 0;
  const search = sanitizeText(searchParams.get("search"), 100);
  const conditions = [];
  if (status && status !== "all" && isValidBookingStatus(status)) conditions.push(eq(bookings.status, status));
  if (technicianId > 0) conditions.push(eq(bookings.technicianId, technicianId));
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(ilike(bookings.clientName, pattern), ilike(bookings.clientPhone, pattern), ilike(bookings.service, pattern))!);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [results, totals] = await Promise.all([
    db.select().from(bookings).innerJoin(technicians, eq(bookings.technicianId, technicians.id))
      .where(where).orderBy(desc(bookings.bookingDate), desc(bookings.bookingTime)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(bookings).where(where),
  ]);
  return NextResponse.json({ items: results, total: totals[0]?.total || 0, page, pageSize });
}

export async function PUT(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const id = typeof body.id === "number" ? body.id : 0;
    if (!id) return NextResponse.json({ error: "Valid booking ID is required" }, { status: 400 });
    if (body.status !== undefined && !isValidBookingStatus(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (body.bookingDate !== undefined && !isValidDate(body.bookingDate)) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    if (body.bookingTime !== undefined && !isValidTime(body.bookingTime)) return NextResponse.json({ error: "Invalid time" }, { status: 400 });

    const currentRows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    const current = currentRows[0];
    if (!current) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const nextDate = body.bookingDate ?? current.bookingDate;
    const nextTime = body.bookingTime?.slice(0, 5) ?? current.bookingTime.slice(0, 5);
    const nextStatus = body.status ?? current.status;
    const safeUpdates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.status !== undefined) safeUpdates.status = body.status;
    if (typeof body.adminNotes === "string") safeUpdates.adminNotes = sanitizeText(body.adminNotes, 500);
    if (typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0) {
      safeUpdates.price = Math.round(body.price);
      safeUpdates.priceIsEstimate = false;
    }
    if (typeof body.duration === "number" && Number.isInteger(body.duration) && body.duration > 0 && body.duration <= 480) {
      safeUpdates.duration = body.duration;
    }
    if (body.bookingDate !== undefined) safeUpdates.bookingDate = body.bookingDate;
    if (body.bookingTime !== undefined) safeUpdates.bookingTime = nextTime;

    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${current.technicianId}:${nextDate}`}))`);
      if (nextStatus === "confirmed" || nextStatus === "pending_deposit") {
        const techRows = await tx.select().from(technicians).where(eq(technicians.id, current.technicianId)).limit(1);
        const tech = techRows[0];
        const weekday = new Date(`${nextDate}T00:00:00Z`).getUTCDay();
        const nextDuration = (safeUpdates.duration as number | undefined) ?? current.duration ?? 60;
        if (!tech || !isDayAvailable(tech, weekday) || !generateTimeSlots(tech).includes(nextTime) || !appointmentFitsSchedule(tech, nextTime)) {
          throw new AdminBookingError("Time is outside the technician's schedule", 400);
        }
        const blocked = await tx.select({ id: blockedDates.id }).from(blockedDates).where(and(
          eq(blockedDates.technicianId, current.technicianId), eq(blockedDates.blockedDate, nextDate)
        )).limit(1);
        if (blocked.length) throw new AdminBookingError("Technician is blocked on this date", 409);
        const collision = await tx.select({ bookingTime: bookings.bookingTime, duration: bookings.duration }).from(bookings).where(and(
          eq(bookings.technicianId, current.technicianId), eq(bookings.bookingDate, nextDate),
          ne(bookings.id, id), sql`${bookings.status} in ('confirmed', 'pending_deposit')`
        ));
        if (hasBookingConflict(collision, nextTime, nextDuration)) throw new AdminBookingError("This time overlaps another appointment", 409);
      }
      await tx.update(bookings).set(safeUpdates).where(eq(bookings.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AdminBookingError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (isUniqueViolation(error)) return NextResponse.json({ error: "This time slot is already booked" }, { status: 409 });
    console.error("Admin booking update error:", error);
    return NextResponse.json({ error: "Could not update booking" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const technicianId = typeof body.technicianId === "number" ? body.technicianId : 0;
    const clientName = sanitizeText(body.clientName, 200);
    const clientPhone = sanitizePhone(body.clientPhone);
    const service = sanitizeText(body.service, 200);
    const bookingDate = body.bookingDate;
    const bookingTime = typeof body.bookingTime === "string" ? body.bookingTime.slice(0, 5) : "";
    const notes = sanitizeText(body.notes, 500) || null;
    const extras: string[] = Array.isArray(body.extras) ? [...new Set<string>(body.extras.map((item: unknown) => sanitizeText(item, 100)).filter(Boolean))].slice(0, 10) : [];
    if (!technicianId || !clientName || !clientPhone || !service || !isValidDate(bookingDate) || !isValidTime(bookingTime)) {
      return NextResponse.json({ error: "Valid technician, client, service, date and time are required" }, { status: 400 });
    }

    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${technicianId}:${bookingDate}`}))`);
      const techRows = await tx.select().from(technicians).where(and(eq(technicians.id, technicianId), eq(technicians.active, true))).limit(1);
      const tech = techRows[0];
      if (!tech) throw new AdminBookingError("Technician not found", 404);
      const selectedServiceRows = await tx.select().from(services).where(and(eq(services.name, service), eq(services.active, true))).limit(1);
      const selectedService = selectedServiceRows[0];
      const selectedExtras = extras.length ? await tx.select().from(services).where(and(inArray(services.name, extras), eq(services.active, true), inArray(services.category, ["extras", tech.category]))) : [];
      if (!selectedService || selectedService.category !== tech.category || selectedExtras.length !== extras.length) {
        throw new AdminBookingError("Invalid service or extras for this technician", 400);
      }
      const duration = selectedService.duration + selectedExtras.reduce((sum, item) => sum + item.duration, 0);
      const day = new Date(`${bookingDate}T00:00:00Z`).getUTCDay();
      if (!isDayAvailable(tech, day) || !generateTimeSlots(tech).includes(bookingTime) || !appointmentFitsSchedule(tech, bookingTime)) throw new AdminBookingError("Time is outside the technician's schedule", 400);
      const unavailable = await tx.select({ id: blockedDates.id }).from(blockedDates).where(and(eq(blockedDates.technicianId, technicianId), eq(blockedDates.blockedDate, bookingDate))).limit(1);
      if (unavailable.length) throw new AdminBookingError("Technician is blocked on this date", 409);
      const collision = await tx.select({ bookingTime: bookings.bookingTime, duration: bookings.duration }).from(bookings).where(and(eq(bookings.technicianId, technicianId), eq(bookings.bookingDate, bookingDate), sql`${bookings.status} in ('confirmed', 'pending_deposit')`));
      if (hasBookingConflict(collision, bookingTime, duration)) throw new AdminBookingError("This time overlaps another appointment", 409);

      const clientRows = await tx.insert(clients).values({ name: clientName, phone: clientPhone, phoneNormalized: normalizePhone(clientPhone) }).onConflictDoUpdate({
        target: clients.phoneNormalized, set: { name: clientName, phone: clientPhone, updatedAt: new Date() },
      }).returning({ id: clients.id });
      let price: number | null = selectedService.price;
      for (const extra of selectedExtras) { if (extra.price && price !== null) price += extra.price; }
      const rows = await tx.insert(bookings).values({ clientId: clientRows[0].id, serviceId: selectedService.id, technicianId, clientName, clientPhone, service, extras, price, priceIsEstimate: selectedService.priceMax !== null, bookingDate, bookingTime, duration, status: "confirmed", policyAcknowledged: true, notes }).returning();
      return { booking: rows[0], technicianName: tech.name };
    });

    return NextResponse.json(created.booking);
  } catch (error) {
    if (error instanceof AdminBookingError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (isUniqueViolation(error)) return NextResponse.json({ error: "This time slot is already booked" }, { status: 409 });
    console.error("Admin booking creation error:", error);
    return NextResponse.json({ error: "Could not create booking" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number.parseInt(new URL(request.url).searchParams.get("id") || "", 10);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Valid booking ID is required" }, { status: 400 });
  const rows = await db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!["cancelled", "rescheduled"].includes(rows[0].status)) {
    return NextResponse.json({ error: "Only cancelled or rescheduled bookings can be permanently deleted" }, { status: 409 });
  }
  await db.delete(bookings).where(eq(bookings.id, id));
  return NextResponse.json({ success: true });
}

class AdminBookingError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
