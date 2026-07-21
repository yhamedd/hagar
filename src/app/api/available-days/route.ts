import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedDates, bookings } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
} from "date-fns";
import { generateTimeSlots, isDayAvailable } from "@/lib/slots";
import { cleanupStaleBookings } from "@/lib/cleanupBookings";
import { parseId } from "@/lib/validate";
import { appointmentFitsSchedule, hasBookingConflict } from "@/lib/bookingConflicts";
import { findActiveTechnician, requestedDuration } from "@/lib/availability";
import { cairoNowParts } from "@/lib/cairoTime";

export async function GET(request: Request) {
  await cleanupStaleBookings();
  const { searchParams } = new URL(request.url);
  const techId = parseId(searchParams.get("technicianId"));
  const monthStr = searchParams.get("month"); // e.g. '2026-07'
  const duration = requestedDuration(searchParams);

  if (!techId) {
    return NextResponse.json({ error: "Valid technicianId is required" }, { status: 400 });
  }
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    return NextResponse.json({ error: "Valid month (yyyy-MM) is required" }, { status: 400 });
  }

  const tech = await findActiveTechnician(techId);
  if (!tech) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }
  const monthDate = new Date(monthStr + "-01T00:00:00");
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  // Get blocked dates for this month
  const blocked = await db
    .select()
    .from(blockedDates)
    .where(
      and(
        eq(blockedDates.technicianId, techId),
        gte(blockedDates.blockedDate, format(monthStart, "yyyy-MM-dd")),
        lte(blockedDates.blockedDate, format(monthEnd, "yyyy-MM-dd"))
      )
    );

  const blockedDateSet = new Set(blocked.map((b) => b.blockedDate));

  // Get all bookings for the month
  const monthBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.technicianId, techId),
        gte(bookings.bookingDate, format(monthStart, "yyyy-MM-dd")),
        lte(bookings.bookingDate, format(monthEnd, "yyyy-MM-dd"))
      )
    );

  const allSlots = generateTimeSlots(tech);
  const now = cairoNowParts();

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const availableDays = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayOfWeek = getDay(day);
    const isPast = dateStr < now.date;

    if (isPast || !isDayAvailable(tech, dayOfWeek) || blockedDateSet.has(dateStr)) {
      return { date: dateStr, available: false, slotsRemaining: 0 };
    }

    const dayBookings = monthBookings.filter(
      (b) =>
        b.bookingDate === dateStr &&
        (b.status === "confirmed" || b.status === "pending_deposit")
    );
    const slotsRemaining = allSlots.filter(
      (slot) =>
        appointmentFitsSchedule(tech, slot) &&
        !hasBookingConflict(dayBookings, slot, duration) &&
        (dateStr !== now.date || slot > now.time)
    ).length;

    return { date: dateStr, available: slotsRemaining > 0, slotsRemaining };
  });

  return NextResponse.json({ days: availableDays });
}
