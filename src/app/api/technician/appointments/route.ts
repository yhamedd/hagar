import { NextResponse } from "next/server";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, technicians } from "@/db/schema";
import { getTechnicianSession } from "@/lib/auth";
import { isValidDate, parseId } from "@/lib/validate";

export async function GET(request: Request) {
  if (!(await getTechnicianSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const technicianId = parseId(params.get("technicianId"));
  const from = params.get("from");
  const to = params.get("to");
  if (!technicianId || !isValidDate(from) || !isValidDate(to) || from! > to!) {
    return NextResponse.json({ error: "Valid technician and date range are required" }, { status: 400 });
  }

  const technician = await db.select({ id: technicians.id }).from(technicians)
    .where(and(eq(technicians.id, technicianId), eq(technicians.active, true))).limit(1);
  if (!technician.length) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

  // Privacy boundary: client identity, contact, notes, price and payment status
  // are intentionally absent from this select and never reach the browser.
  const rows = await db.select({
    bookingDate: bookings.bookingDate,
    bookingTime: bookings.bookingTime,
    duration: bookings.duration,
    service: bookings.service,
  }).from(bookings).where(and(
    eq(bookings.technicianId, technicianId),
    gte(bookings.bookingDate, from!),
    lte(bookings.bookingDate, to!),
    inArray(bookings.status, ["pending_deposit", "confirmed", "completed", "no_show"]),
  )).orderBy(asc(bookings.bookingDate), asc(bookings.bookingTime));
  return NextResponse.json(rows);
}
