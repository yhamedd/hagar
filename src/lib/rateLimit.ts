import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { eq, lt, sql } from "drizzle-orm";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX_ATTEMPTS = 10;

export interface RateLimitOptions {
  /** Maximum requests allowed inside the window (default 10). */
  max?: number;
  /** Rolling window length in milliseconds (default 15 minutes). */
  windowMs?: number;
}

/**
 * Shared PostgreSQL-backed limiter, safe across server instances.
 *
 * The default (10 / 15 min) suits sensitive endpoints like login and booking
 * creation. Pass a looser `max`/`windowMs` for high-frequency public reads such
 * as slot/availability lookups, which a single user legitimately hits many times
 * while browsing the calendar.
 */
export async function checkRateLimit(key: string, options: RateLimitOptions = {}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxAttempts = options.max ?? DEFAULT_MAX_ATTEMPTS;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`rate:${key}`}))`);
    const now = new Date();
    const rows = await tx.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
    const record = rows[0];
    if (!record || record.resetAt <= now) {
      await tx.insert(rateLimits).values({ key, count: 1, resetAt: new Date(now.getTime() + windowMs) })
        .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, resetAt: new Date(now.getTime() + windowMs) } });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (record.count >= maxAttempts) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000)) };
    }
    await tx.update(rateLimits).set({ count: record.count + 1 }).where(eq(rateLimits.key, key));
    if (Math.random() < 0.01) await tx.delete(rateLimits).where(lt(rateLimits.resetAt, now));
    return { allowed: true, retryAfterSeconds: 0 };
  });
}
