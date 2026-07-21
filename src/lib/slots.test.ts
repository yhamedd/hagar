import { describe, expect, it } from "vitest";
import { generateTimeSlots, isDayAvailable } from "./slots";

describe("technician slots", () => {
  it("generates range slots without treating closing time as a start", () => {
    expect(generateTimeSlots({ slotType: "range", availableDays: [1], startTime: "13:00:00", endTime: "16:00:00", slotInterval: 60, fixedSlots: null }))
      .toEqual(["13:00", "14:00", "15:00"]);
  });

  it("uses fixed slots and weekday availability", () => {
    const technician = { slotType: "fixed", availableDays: [2], startTime: null, endTime: null, slotInterval: null, fixedSlots: ["11:30", "13:00"] };
    expect(generateTimeSlots(technician)).toEqual(["11:30", "13:00"]);
    expect(isDayAvailable(technician, 2)).toBe(true);
    expect(isDayAvailable(technician, 3)).toBe(false);
  });
});
