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

    while (isBefore(current, end) || isEqual(current, end)) {
      slots.push(format(current, "HH:mm"));
      current = addMinutes(current, tech.slotInterval);
      // Don't add the end time itself as a slot if it's the closing time
      if (isEqual(current, end) || isBefore(end, current)) break;
    }

    return slots;
  }

  return [];
}

export function isDayAvailable(tech: TechnicianAvailability, dayOfWeek: number): boolean {
  return tech.availableDays.includes(dayOfWeek);
}
