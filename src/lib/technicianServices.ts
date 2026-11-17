import { eq } from "drizzle-orm";
import { db } from "@/db";
import { technicianServices } from "@/db/schema";

/**
 * Returns null when the technician is unrestricted (can perform any service in their category).
 *
 * Inside a transaction, pass the transaction as `executor`. Querying through
 * the pool there would take a second connection while the first is held; with
 * several bookings in flight at once that can exhaust the pool and stall every
 * request until the connection timeout.
 */
export async function getAllowedServiceIds(technicianId: number, executor: Pick<typeof db, "select"> = db): Promise<Set<number> | null> {
  const rows = await executor.select({ serviceId: technicianServices.serviceId }).from(technicianServices).where(eq(technicianServices.technicianId, technicianId));
  return rows.length ? new Set(rows.map((row) => row.serviceId)) : null;
}
