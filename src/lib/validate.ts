/**
 * Server-side input validation / sanitisation helpers.
 */

const MAX_TEXT = 500;
const MAX_PHONE = 30;

/** Trim + cap length.  Returns empty string for non-strings. */
export function sanitizeText(v: unknown, max = MAX_TEXT): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

export function sanitizePhone(v: unknown): string {
  return sanitizeText(v, MAX_PHONE);
}

/** Normalize phone: strip spaces, dashes, brackets, leading +20/0020 → 0 */
export function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-\(\)\+]/g, "");
  // Egypt: +20 or 0020 prefix → convert to local 0
  if (p.startsWith("20") && p.length > 10) p = "0" + p.slice(2);
  if (p.startsWith("0020")) p = "0" + p.slice(4);
  return p;
}

/** Returns true when the value looks like yyyy-MM-dd */
export function isValidDate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const match = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

/** Returns true when the value looks like HH:mm or HH:mm:ss with valid ranges */
export function isValidTime(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const m = v.match(/^(\d{2}):(\d{2})(:\d{2})?$/);
  if (!m) return false;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/** Parse a query-string id, returning null on bad input */
export function parseId(v: string | null): number | null {
  if (!v) return null;
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

const ALLOWED_BOOKING_STATUSES = ["pending_deposit", "confirmed", "completed", "cancelled", "no_show", "rescheduled"] as const;
type BookingStatus = (typeof ALLOWED_BOOKING_STATUSES)[number];

export function isValidBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && (ALLOWED_BOOKING_STATUSES as readonly string[]).includes(v);
}

const ALLOWED_CATEGORIES = ["lashes", "nails"] as const;
export function isValidCategory(v: unknown): v is string {
  return typeof v === "string" && (ALLOWED_CATEGORIES as readonly string[]).includes(v);
}

const ALLOWED_SLOT_TYPES = ["range", "fixed"] as const;
export function isValidSlotType(v: unknown): v is string {
  return typeof v === "string" && (ALLOWED_SLOT_TYPES as readonly string[]).includes(v);
}
