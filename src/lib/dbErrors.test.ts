import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./dbErrors";

describe("database error handling", () => {
  it("recognizes direct and driver-wrapped unique constraint errors", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { data: { code: "23505" } } })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
  });
});
