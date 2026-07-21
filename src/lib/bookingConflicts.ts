import type { TechnicianAvailability } from "@/lib/slots";

type OccupiedBooking = { bookingTime: string; duration: number | null };

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function rangesOverlap(startA: string, durationA: number, startB: string, durationB: number): boolean {
  const a = timeToMinutes(startA);
  const b = timeToMinutes(startB);
  return a < b + durationB && b < a + durationA;
}

export function hasBookingConflict(existing: OccupiedBooking[], start: string, duration: number): boolean {
  return existing.some((booking) => rangesOverlap(
    booking.bookingTime,
    booking.duration || 60,
    start,
    duration,
  ));
}

// A service is allowed to run past closing time once it has started (e.g. a
// technician working 13:00-19:00 can still start a 2-hour service at 19:00,
// the last appointment slot); only the start time needs to fall within hours.
export function appointmentFitsSchedule(tech: TechnicianAvailability, start: string): boolean {
  if (tech.slotType === "fixed") return Boolean(tech.fixedSlots?.includes(start.slice(0, 5)));
  if (!tech.startTime || !tech.endTime) return false;
  const startMinutes = timeToMinutes(start);
  return startMinutes >= timeToMinutes(tech.startTime) && startMinutes <= timeToMinutes(tech.endTime);
}
