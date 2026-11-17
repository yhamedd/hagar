import { describe, expect, it } from "vitest";
import { buildReminderMessage, formatReminderDate, reminderLink, toWhatsAppNumber } from "./whatsapp";

const booking = {
  clientName: "Salma Ahmed",
  clientPhone: "010 1234 5678",
  service: "Classic Lashes",
  extras: ["Lash Lift"],
  bookingDate: "2026-11-18",
  bookingTime: "14:30:00",
  status: "confirmed",
};

describe("toWhatsAppNumber", () => {
  it("adds the Egypt country code to local numbers", () => {
    expect(toWhatsAppNumber("010 1234 5678")).toBe("201012345678");
    expect(toWhatsAppNumber("0101-234-5678")).toBe("201012345678");
    expect(toWhatsAppNumber("1012345678")).toBe("201012345678");
  });

  it("keeps numbers already written internationally", () => {
    expect(toWhatsAppNumber("+20 101 234 5678")).toBe("201012345678");
    expect(toWhatsAppNumber("0020 101 234 5678")).toBe("201012345678");
    expect(toWhatsAppNumber("201012345678")).toBe("201012345678");
    expect(toWhatsAppNumber("+971 50 123 4567")).toBe("971501234567");
  });

  it("rejects values that cannot be dialled", () => {
    expect(toWhatsAppNumber("")).toBeNull();
    expect(toWhatsAppNumber(null)).toBeNull();
    expect(toWhatsAppNumber("12345")).toBeNull();
    expect(toWhatsAppNumber("call me")).toBeNull();
  });
});

describe("reminder message", () => {
  it("formats the date without timezone drift", () => {
    expect(formatReminderDate("2026-11-18")).toBe("Wednesday, 18 November");
  });

  it("includes who, when, what and where", () => {
    const message = buildReminderMessage(booking, "Nada");
    expect(message).toContain("Hi Salma");
    expect(message).toContain("Wednesday, 18 November at 2:30 PM");
    expect(message).toContain("Classic Lashes + Lash Lift with Nada");
    expect(message).toContain("Agora Mall, New Cairo");
    expect(message).not.toContain("deposit");
    // Plain ASCII only: emoji arrive as "\uFFFD" on some phones when sent through wa.me links.
    expect(message).toMatch(/^[\x20-\x7E\n]+$/);
  });

  it("asks for the deposit while the booking is still pending", () => {
    expect(buildReminderMessage({ ...booking, status: "pending_deposit" }, "Nada")).toContain("1,000 EGP deposit");
  });

  it("builds a wa.me link addressed to the client", () => {
    const link = reminderLink(booking, "Nada");
    expect(link).toMatch(/^https:\/\/wa\.me\/201012345678\?text=Hi%20Salma/);
    expect(reminderLink({ ...booking, clientPhone: "n/a" }, "Nada")).toBeNull();
  });
});
