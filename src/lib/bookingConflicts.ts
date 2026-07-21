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

export function appointmentFitsSchedule(tech: TechnicianAvailability, start: string, duration: number): boolean {
  if (tech.slotType === "fixed") return Boolean(tech.fixedSlots?.includes(start.slice(0, 5)));
  if (!tech.startTime || !tech.endTime) return false;
  const startMinutes = timeToMinutes(start);
  return startMinutes >= timeToMinutes(tech.startTime) && startMinutes + duration <= timeToMinutes(tech.endTime);
}
