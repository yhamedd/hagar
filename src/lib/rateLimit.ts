import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { eq, lt, sql } from "drizzle-orm";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

/** Shared PostgreSQL-backed limiter, safe across server instances. */
export async function checkRateLimit(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`rate:${key}`}))`);
    const now = new Date();
    const rows = await tx.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1);
    const record = rows[0];
    if (!record || record.resetAt <= now) {
      await tx.insert(rateLimits).values({ key, count: 1, resetAt: new Date(now.getTime() + WINDOW_MS) })
        .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, resetAt: new Date(now.getTime() + WINDOW_MS) } });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (record.count >= MAX_ATTEMPTS) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000)) };
    }
    await tx.update(rateLimits).set({ count: record.count + 1 }).where(eq(rateLimits.key, key));
    if (Math.random() < 0.01) await tx.delete(rateLimits).where(lt(rateLimits.resetAt, now));
    return { allowed: true, retryAfterSeconds: 0 };
  });
}
