import { describe, expect, it } from "vitest";
import { appointmentFitsSchedule, hasBookingConflict, rangesOverlap } from "./bookingConflicts";

describe("duration-aware booking conflicts", () => {
  it("detects partial overlaps but allows adjacent appointments", () => {
    expect(rangesOverlap("13:00", 120, "14:00", 60)).toBe(true);
    expect(rangesOverlap("13:00", 60, "14:00", 60)).toBe(false);
  });

  it("uses saved booking duration snapshots", () => {
    expect(hasBookingConflict([{ bookingTime: "13:00:00", duration: 120 }], "14:30", 60)).toBe(true);
    expect(hasBookingConflict([{ bookingTime: "13:00:00", duration: 90 }], "14:30", 60)).toBe(false);
  });

  it("prevents services from extending past closing", () => {
    const tech = { slotType: "range", availableDays: [1], startTime: "13:00", endTime: "19:00", slotInterval: 60, fixedSlots: null };
    expect(appointmentFitsSchedule(tech, "17:00", 120)).toBe(true);
    expect(appointmentFitsSchedule(tech, "18:00", 120)).toBe(false);
  });
});
