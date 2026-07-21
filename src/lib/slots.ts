import { format, parse, addMinutes, isBefore, isEqual } from "date-fns";

export interface TechnicianAvailability {
  slotType: string;
  availableDays: number[];
  startTime: string | null;
  endTime: string | null;
  slotInterval: number | null;
  fixedSlots: string[] | null;
}

export function generateTimeSlots(tech: TechnicianAvailability): string[] {
  if (tech.slotType === "fixed" && tech.fixedSlots) {
    return tech.fixedSlots;
  }

  if (tech.slotType === "range" && tech.startTime && tech.endTime && tech.slotInterval) {
    const slots: string[] = [];
    const baseDate = new Date(2000, 0, 1);
    const start = parse(tech.startTime, "HH:mm:ss", baseDate);
    const end = parse(tech.endTime, "HH:mm:ss", baseDate);
    let current = start;

    // The closing time itself is a valid last appointment (e.g. hours 13:00-19:00
    // means 19:00 is the last bookable start, not 18:00).
    while (isBefore(current, end) || isEqual(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, tech.slotInterval);
    }

    return slots;
  }

  return [];
}

export function isDayAvailable(tech: TechnicianAvailability, dayOfWeek: number): boolean {
  return tech.availableDays.includes(dayOfWeek);
}
