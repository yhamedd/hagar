import { SITE } from "./site";
import { formatTime12h } from "./timeFormat";

/**
 * Convert a phone number as clients type it into the digits-only international
 * form WhatsApp's click-to-chat links require (no "+", no leading zeros).
 * Local Egyptian numbers ("010 1234 5678") gain the 20 country code; numbers
 * already written internationally ("+971…", "0020…") are kept as they are.
 * Returns null when the input cannot be a dialable number.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const international = trimmed.startsWith("+") || trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  if (international) {
    digits = digits.replace(/^0+/, "");
  } else if (digits.startsWith("0")) {
    digits = `20${digits.slice(1)}`;
  } else if (digits.length === 10 && digits.startsWith("1")) {
    // Egyptian mobile typed without the leading 0 ("10 1234 5678").
    digits = `20${digits}`;
  }
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export interface ReminderBooking {
  clientName: string;
  clientPhone: string;
  service: string;
  extras?: string[] | null;
  bookingDate: string; // yyyy-MM-dd
  bookingTime: string; // HH:mm[:ss]
  status: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "Tuesday, 18 November" -- computed in UTC so it never shifts with the viewer's timezone. */
export function formatReminderDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return `${WEEKDAYS[parsed.getUTCDay()]}, ${parsed.getUTCDate()} ${MONTHS[parsed.getUTCMonth()]}`;
}

export function buildReminderMessage(booking: ReminderBooking, technicianName: string): string {
  const firstName = booking.clientName.trim().split(/\s+/)[0] || "there";
  const services = [booking.service, ...(booking.extras || [])].filter(Boolean).join(" + ");
  const lines = [
    `Hi ${firstName} \u{1F90D}`,
    `This is a friendly reminder of your appointment at ${SITE.name}:`,
    "",
    `\u{1F4C5} ${formatReminderDate(booking.bookingDate)} at ${formatTime12h(booking.bookingTime)}`,
    `✨ ${services} with ${technicianName}`,
    `\u{1F4CD} ${SITE.location}: ${SITE.mapsUrl}`,
    "",
  ];
  if (booking.status === "pending_deposit") {
    lines.push(
      `Your booking is not confirmed yet. Please send the ${SITE.depositEgp.toLocaleString("en-US")} EGP deposit via InstaPay (${SITE.instapayDisplay}) and share the screenshot here to keep your slot.`,
      ""
    );
  }
  lines.push(
    `Please arrive on time, as bookings are cancelled after ${SITE.lateGraceMinutes} minutes of delay.`,
    "See you soon!"
  );
  return lines.join("\n");
}

/** Click-to-chat link that opens WhatsApp with the reminder pre-written, or null if the phone is unusable. */
export function reminderLink(booking: ReminderBooking, technicianName: string): string | null {
  const number = toWhatsAppNumber(booking.clientPhone);
  return number ? whatsappLink(number, buildReminderMessage(booking, technicianName)) : null;
}
