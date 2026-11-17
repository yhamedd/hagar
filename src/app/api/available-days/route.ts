import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedDates, bookings } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
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
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, retryAfterSeconds } = await checkRateLimit(`availability:${ip}`, { max: 120, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

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

  const monthDate = new Date(monthStr + "-01T00:00:00");
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const from = format(monthStart, "yyyy-MM-dd");
  const to = format(monthEnd, "yyyy-MM-dd");

  // The three lookups are independent, so run them together and fetch only
  // the columns and rows the availability maths actually uses.
  const [tech, blocked, monthBookings] = await Promise.all([
    findActiveTechnician(techId),
    db
    .select({ blockedDate: blockedDates.blockedDate })
    .from(blockedDates)
    .where(
      and(
        eq(blockedDates.technicianId, techId),
        gte(blockedDates.blockedDate, from),
        lte(blockedDates.blockedDate, to)
      )
    ),
    db
    .select({ bookingDate: bookings.bookingDate, bookingTime: bookings.bookingTime, duration: bookings.duration })
    .from(bookings)
    .where(
      and(
        eq(bookings.technicianId, techId),
        gte(bookings.bookingDate, from),
        lte(bookings.bookingDate, to),
        inArray(bookings.status, ["confirmed", "pending_deposit"])
      )
    ),
  ]);
  if (!tech) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }

  const blockedDateSet = new Set(blocked.map((b) => b.blockedDate));
  // Group once instead of re-filtering the whole month for every day.
  const bookingsByDate = new Map<string, typeof monthBookings>();
  for (const booking of monthBookings) {
    bookingsByDate.set(booking.bookingDate, [...(bookingsByDate.get(booking.bookingDate) || []), booking]);
  }

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

    const dayBookings = bookingsByDate.get(dateStr) || [];
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
