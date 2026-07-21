import { db } from "@/db";
import { bookings } from "@/db/schema";
import { eq, and, lt } from "drizzle-orm";

const THROTTLE_MS = 60 * 1000;
const globalForCleanup = globalThis as typeof globalThis & { __hagarLastCleanupAt?: number };

/**
 * Auto-cancel any "pending_deposit" booking older than 1 hour.
 * Called on slot/availability checks and booking list endpoints
 * to keep stale holds from blocking the calendar. Throttled because
 * these endpoints are hit on every calendar/slot request; running the
 * update on every single call would mean an unindexed table scan and
 * write per page view instead of at most once per minute.
 */
export async function cleanupStaleBookings() {
  const now = Date.now();
  if (globalForCleanup.__hagarLastCleanupAt && now - globalForCleanup.__hagarLastCleanupAt < THROTTLE_MS) return;
  globalForCleanup.__hagarLastCleanupAt = now;

  const oneHourAgo = new Date(now - 60 * 60 * 1000);

  await db
    .update(bookings)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(bookings.status, "pending_deposit"),
        lt(bookings.createdAt, oneHourAgo)
      )
    );
}
