import { eq } from "drizzle-orm";
import { db } from "@/db";
import { technicianServices } from "@/db/schema";

/** Returns null when the technician is unrestricted (can perform any service in their category). */
export async function getAllowedServiceIds(technicianId: number): Promise<Set<number> | null> {
  const rows = await db.select({ serviceId: technicianServices.serviceId }).from(technicianServices).where(eq(technicianServices.technicianId, technicianId));
  return rows.length ? new Set(rows.map((row) => row.serviceId)) : null;
}
