import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron";

const URL = "https://example.com/api/cron/cleanup-bookings";

describe("cron request authorization", () => {
  beforeEach(() => { process.env.CRON_SECRET = "s3cret-value-at-least-16"; });
  afterEach(() => { delete process.env.CRON_SECRET; });

  it("rejects everything when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(new Request(`${URL}?secret=anything`))).toBe(false);
  });

  it("accepts a matching bearer header", () => {
    const request = new Request(URL, { headers: { authorization: "Bearer s3cret-value-at-least-16" } });
    expect(isAuthorizedCronRequest(request)).toBe(true);
  });

  it("accepts a matching secret query parameter", () => {
    expect(isAuthorizedCronRequest(new Request(`${URL}?secret=s3cret-value-at-least-16`))).toBe(true);
  });

  it("rejects a wrong or partial secret", () => {
    expect(isAuthorizedCronRequest(new Request(URL, { headers: { authorization: "Bearer wrong" } }))).toBe(false);
    expect(isAuthorizedCronRequest(new Request(`${URL}?secret=s3cret-value`))).toBe(false);
    expect(isAuthorizedCronRequest(new Request(URL))).toBe(false);
  });
});
