import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";

const THROTTLE_MS = 60 * 1000;
// Deposit hold window: long enough that an overnight/sleeping admin still has
// time to see the payment proof and manually confirm before it auto-cancels.
export const DEPOSIT_HOLD_MS = 12 * 60 * 60 * 1000;
const globalForCleanup = globalThis as typeof globalThis & { __hagarLastCleanupAt?: number };

/**
 * Auto-cancel every "pending_deposit" booking older than DEPOSIT_HOLD_MS and
 * return how many were released. This is the real work; call it directly from
 * the scheduled cron route where the run must always happen.
 */
export async function runStaleBookingCleanup(): Promise<number> {
  const cutoff = new Date(Date.now() - DEPOSIT_HOLD_MS);
  const released = await db
    .update(bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(bookings.status, "pending_deposit"),
        lt(bookings.createdAt, cutoff)
      )
    )
    .returning({ id: bookings.id });
  return released.length;
}

/**
 * Opportunistic wrapper around {@link runStaleBookingCleanup}. Called on
 * slot/availability checks and booking list endpoints so stale holds do not
 * linger between scheduled cron runs. Throttled because these endpoints are hit
 * on every calendar/slot request; running the update on every single call would
 * mean a scan and write per page view instead of at most once per minute.
 */
export async function cleanupStaleBookings() {
  const now = Date.now();
  if (globalForCleanup.__hagarLastCleanupAt && now - globalForCleanup.__hagarLastCleanupAt < THROTTLE_MS) return;
  globalForCleanup.__hagarLastCleanupAt = now;
  await runStaleBookingCleanup();
}
