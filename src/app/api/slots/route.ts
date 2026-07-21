import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, blockedDates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateTimeSlots, isDayAvailable } from "@/lib/slots";
import { getDay } from "date-fns";
import { cleanupStaleBookings } from "@/lib/cleanupBookings";
import { parseId, isValidDate } from "@/lib/validate";
import { appointmentFitsSchedule, hasBookingConflict } from "@/lib/bookingConflicts";
import { findActiveTechnician } from "@/lib/availability";
import { cairoNowParts } from "@/lib/cairoTime";

export async function GET(request: Request) {
  await cleanupStaleBookings();
  const { searchParams } = new URL(request.url);
  const techId = parseId(searchParams.get("technicianId"));
  const dateStr = searchParams.get("date");

  if (!techId) {
    return NextResponse.json({ error: "Valid technicianId is required" }, { status: 400 });
  }
  if (!isValidDate(dateStr)) {
    return NextResponse.json({ error: "Valid date (yyyy-MM-dd) is required" }, { status: 400 });
  }

  const tech = await findActiveTechnician(techId);
  if (!tech) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }

  // Check if the date's day of week is available
  const dateObj = new Date(dateStr + "T00:00:00");
  const dayOfWeek = getDay(dateObj);

  if (!isDayAvailable(tech, dayOfWeek)) {
    return NextResponse.json({ slots: [], available: false, reason: "Day not available" });
  }

  // Check blocked dates
  const blocked = await db
    .select()
    .from(blockedDates)
    .where(
      and(
        eq(blockedDates.technicianId, techId),
        eq(blockedDates.blockedDate, dateStr)
      )
    );

  if (blocked.length > 0) {
    return NextResponse.json({
      slots: [],
      available: false,
      reason: "Technician is unavailable on this date",
    });
  }

  // Generate all possible slots
  const allSlots = generateTimeSlots(tech);

  // Get existing bookings for this technician on this date (both confirmed + pending)
  const existingBookings = await db
    .select({ bookingTime: bookings.bookingTime, status: bookings.status })
    .from(bookings)
    .where(
      and(
        eq(bookings.technicianId, techId),
        eq(bookings.bookingDate, dateStr)
      )
    );

  const occupied = existingBookings.filter((b) => b.status === "confirmed" || b.status === "pending_deposit");

  const now = cairoNowParts();
  if (dateStr < now.date) {
    return NextResponse.json({ slots: allSlots.map((slot) => ({ time: slot, available: false })), available: false, reason: "This date has already passed" });
  }

  const slots = allSlots.map((slot) => ({
    time: slot,
    available:
      appointmentFitsSchedule(tech, slot) &&
      !hasBookingConflict(occupied, slot, tech.slotInterval || 60) &&
      (dateStr !== now.date || slot > now.time),
  }));

  return NextResponse.json({ slots, available: true });
}
