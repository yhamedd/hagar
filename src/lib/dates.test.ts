import { describe, expect, it } from "vitest";
import { shiftDate } from "./dates";

describe("shiftDate", () => {
  it("moves across month and year boundaries", () => {
    expect(shiftDate("2026-11-17", 1)).toBe("2026-11-18");
    expect(shiftDate("2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the first day of the next month from any month start", () => {
    for (const start of ["2026-01-01", "2026-02-01", "2026-12-01"]) {
      const next = `${shiftDate(start, 32).slice(0, 7)}-01`;
      expect(next > start).toBe(true);
      expect(shiftDate(next, -1).slice(0, 7)).toBe(start.slice(0, 7));
    }
  });
});
