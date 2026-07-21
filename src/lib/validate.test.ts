import { describe, expect, it } from "vitest";
import { isValidDate, isValidTime, normalizePhone, parseId } from "./validate";

describe("validation", () => {
  it("rejects impossible calendar dates", () => {
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-13-01")).toBe(false);
  });

  it("validates times and integer identifiers strictly", () => {
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(parseId("12abc")).toBeNull();
    expect(parseId("12")).toBe(12);
  });

  it("normalizes Egyptian phone prefixes", () => {
    expect(normalizePhone("+20 100-006-2272")).toBe("01000062272");
    expect(normalizePhone("00201000062272")).toBe("01000062272");
    expect(normalizePhone("20 (100) 006 2272")).toBe("01000062272");
    expect(normalizePhone("0100 006 2272")).toBe("01000062272");
    expect(normalizePhone("0100-006-2272")).toBe("01000062272");
  });
});
