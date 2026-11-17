"use client";

import { format } from "date-fns";
import { reminderLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/PaymentContact";

// ────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────
export interface Technician {
  id: number;
  name: string;
  category: string;
  slotType: string;
  availableDays: number[];
  startTime: string | null;
  endTime: string | null;
  slotInterval: number | null;
  fixedSlots: string[] | null;
  active: boolean;
}

export interface BookingRow {
  bookings: {
    id: number;
    clientId: number | null;
    technicianId: number;
    clientName: string;
    clientPhone: string;
    service: string;
    extras: string[];
    price: number | null;
    priceIsEstimate: boolean;
    bookingDate: string;
    bookingTime: string;
    duration: number | null;
    status: string;
    notes: string | null;
    adminNotes: string | null;
    reminderSentAt: string | null;
    createdAt: string;
  };
  technicians: { id: number; name: string; category: string };
}

export interface ClientRow {
  id: number;
  name: string;
  phone: string;
  phoneNormalized: string;
  notes: string | null;
  totalBookings: number;
  totalSpent: number;
  upcoming: number;
}

export interface BlockedDate {
  id: number;
  technicianId: number;
  blockedDate: string;
  reason: string | null;
}

// ────────────────────────────────────────────────────────
// Constants & Helpers
// ────────────────────────────────────────────────────────
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type Tab = "overview" | "bookings" | "calendar" | "clients" | "technicians" | "blocked" | "manual";

export const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "bookings", label: "Bookings" },
  { key: "calendar", label: "Calendar" },
  { key: "clients", label: "Clients" },
  { key: "technicians", label: "Technicians" },
  { key: "blocked", label: "Schedule" },
  { key: "manual", label: "New Booking" },
];

export type CalView = "day" | "week" | "month";
export const CANCELLED_STATUSES = ["cancelled", "rescheduled"];

export const STATUSES = [
  { value: "pending_deposit", label: "Pending", bg: "bg-amber-50 text-amber-700" },
  { value: "confirmed", label: "Confirmed", bg: "bg-green-50 text-green-700" },
  { value: "completed", label: "Completed", bg: "bg-blue-50 text-blue-700" },
  { value: "cancelled", label: "Cancelled", bg: "bg-gray-100 text-gray-500" },
  { value: "no_show", label: "No-Show", bg: "bg-red-50 text-red-600" },
  { value: "rescheduled", label: "Rescheduled", bg: "bg-purple-50 text-purple-600" },
];

export function sBg(s: string) { return STATUSES.find((x) => x.value === s)?.bg ?? "bg-gray-100 text-gray-500"; }
export function sLbl(s: string) { return STATUSES.find((x) => x.value === s)?.label ?? s; }

export function fmtDate(d: string) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); }
  catch { return d; }
}

export function fmtPrice(p: number | null) { return p ? p.toLocaleString() + " EGP" : "—"; }

export const TIME_OPTS = (() => {
  const r: { l: string; v: string }[] = [];
  for (let h = 0; h < 24; h++) for (const m of [0, 30]) {
    const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    r.push({ l: `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`, v });
  }
  return r;
})();

// Shared input / select / label class tokens
export const inputCls = "w-full h-9 border border-gray-200 px-3 text-sm focus:outline-none focus:border-black transition-colors";
export const labelCls = "block text-xs text-gray-500 uppercase tracking-wider font-medium mb-1.5";

// ────────────────────────────────────────────────────────
// Badge
// ────────────────────────────────────────────────────────
// Only upcoming appointments that are still going ahead can be reminded.
export const REMINDABLE_STATUSES = ["pending_deposit", "confirmed"];

/**
 * Opens WhatsApp (app or web) on a chat with the client, with the reminder
 * already written -- the admin just presses send. Clicking also records the
 * reminder so everyone on the dashboard can see it has been done.
 */
export function RemindButton({ row, techName, onSent }: { row: BookingRow; techName: string; onSent: (id: number, sent?: boolean) => void }) {
  const b = row.bookings;
  if (!REMINDABLE_STATUSES.includes(b.status) || b.bookingDate < format(new Date(), "yyyy-MM-dd")) return null;
  const href = reminderLink(b, techName);
  if (!href) return <span className="text-[10px] text-gray-400" title="This phone number can't be used on WhatsApp">No WhatsApp no.</span>;
  const sent = b.reminderSentAt ? new Date(b.reminderSentAt) : null;
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onSent(b.id)}
        title={`Send ${b.clientName} a WhatsApp reminder`}
        className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium whitespace-nowrap transition-colors ${sent ? "border border-[#25D366] text-[#128C4B] hover:bg-green-50" : "bg-[#25D366] text-white hover:bg-[#1ebe5d]"}`}
      >
        <WhatsAppIcon className="w-3.5 h-3.5" />
        {sent ? "Remind again" : "Remind"}
      </a>
      {sent && (
        <span className="text-[10px] text-gray-400 whitespace-nowrap">
          Reminded {format(sent, "MMM d, h:mm a")}
          {" · "}
          <button type="button" onClick={() => onSent(b.id, false)} title="Mark as not reminded" className="underline hover:text-black">Undo</button>
        </span>
      )}
    </span>
  );
}

export function Badge({ status }: { status: string }) {
  return <span className={`inline-block px-2 py-0.5 text-xs font-medium whitespace-nowrap ${sBg(status)}`}>{sLbl(status)}</span>;
}

// ────────────────────────────────────────────────────────
// Stat Box
// ────────────────────────────────────────────────────────
export function Stat({ value, label, color = "" }: { value: string | number; label: string; color?: string }) {
  return (
    <div className={`px-3 py-2.5 text-center ${color || "bg-gray-50"}`}>
      <p className={`text-lg font-semibold ${color.includes("green") ? "text-green-700" : color.includes("blue") ? "text-blue-700" : color.includes("purple") ? "text-purple-700" : ""}`}>{value}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

export function Pagination({ page, total, pageSize, onPage }: { page: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
      <span>{total.toLocaleString()} records</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="border border-gray-200 px-3 py-1.5 disabled:opacity-40">Previous</button>
        <span>Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="border border-gray-200 px-3 py-1.5 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
