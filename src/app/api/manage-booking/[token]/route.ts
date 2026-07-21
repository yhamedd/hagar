import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { blockedDates, bookings, technicians } from "@/db/schema";
import { appointmentFitsSchedule, hasBookingConflict } from "@/lib/bookingConflicts";
import { generateTimeSlots, isDayAvailable } from "@/lib/slots";
import { isValidDate, isValidTime } from "@/lib/validate";
import { cairoNowParts } from "@/lib/cairoTime";

type Context = { params: Promise<{ token: string }> };
const activeStatuses = ["pending_deposit", "confirmed"];

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function findBooking(token: string) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const rows = await db.select({ booking: bookings, technician: technicians }).from(bookings)
    .innerJoin(technicians, eq(bookings.technicianId, technicians.id))
    .where(eq(bookings.managementTokenHash, tokenHash(token))).limit(1);
  return rows[0] || null;
}

export async function GET(_: Request, context: Context) {
  const { token } = await context.params;
  const row = await findBooking(token);
  if (!row) return NextResponse.json({ error: "Booking link is invalid or expired" }, { status: 404 });
  const booking = row.booking;
  return NextResponse.json({
    id: booking.id,
    technicianId: booking.technicianId,
    technicianName: row.technician.name,
    service: booking.service,
    extras: booking.extras || [],
    price: booking.price,
    priceIsEstimate: booking.priceIsEstimate,
    bookingDate: booking.bookingDate,
    bookingTime: booking.bookingTime,
    duration: booking.duration || 60,
    status: booking.status,
    canManage: activeStatuses.includes(booking.status),
  });
}

export async function PUT(request: Request, context: Context) {
  const { token } = await context.params;
  const row = await findBooking(token);
  if (!row) return NextResponse.json({ error: "Booking link is invalid or expired" }, { status: 404 });
  if (!activeStatuses.includes(row.booking.status)) return NextResponse.json({ error: "This booking can no longer be changed" }, { status: 409 });
  const body = await request.json();
  if (body.action === "cancel") {
    await db.update(bookings).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(bookings.id, row.booking.id), sql`${bookings.status} in ('pending_deposit', 'confirmed')`));
    return NextResponse.json({ success: true, status: "cancelled" });
  }
  if (body.action !== "reschedule" || !isValidDate(body.bookingDate) || !isValidTime(body.bookingTime)) {
    return NextResponse.json({ error: "Choose a valid new date and time" }, { status: 400 });
  }
  const bookingDate = body.bookingDate;
  const bookingTime = body.bookingTime.slice(0, 5);
  const now = cairoNowParts();
  if (bookingDate < now.date) return NextResponse.json({ error: "Past dates cannot be selected" }, { status: 400 });
  if (bookingDate === now.date && bookingTime <= now.time) return NextResponse.json({ error: "Past times cannot be selected" }, { status: 400 });

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${row.booking.technicianId}:${bookingDate}`}))`);
      const day = new Date(`${bookingDate}T00:00:00Z`).getUTCDay();
      if (!isDayAvailable(row.technician, day) || !generateTimeSlots(row.technician).includes(bookingTime) || !appointmentFitsSchedule(row.technician, bookingTime)) throw new ManageError("Time is outside the technician's schedule", 400);
      const blocked = await tx.select({ id: blockedDates.id }).from(blockedDates).where(and(eq(blockedDates.technicianId, row.booking.technicianId), eq(blockedDates.blockedDate, bookingDate))).limit(1);
      if (blocked.length) throw new ManageError("Technician is unavailable on this date", 409);
      const occupied = await tx.select({ bookingTime: bookings.bookingTime }).from(bookings).where(and(eq(bookings.technicianId, row.booking.technicianId), eq(bookings.bookingDate, bookingDate), ne(bookings.id, row.booking.id), sql`${bookings.status} in ('confirmed', 'pending_deposit')`));
      if (hasBookingConflict(occupied, bookingTime, row.technician.slotInterval || 60)) throw new ManageError("This time overlaps another appointment", 409);
      await tx.update(bookings).set({ bookingDate, bookingTime, updatedAt: new Date() }).where(and(eq(bookings.id, row.booking.id), sql`${bookings.status} in ('confirmed', 'pending_deposit')`));
    });
    return NextResponse.json({ success: true, bookingDate, bookingTime });
  } catch (error) {
    if (error instanceof ManageError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not reschedule booking" }, { status: 500 });
  }
}

class ManageError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
