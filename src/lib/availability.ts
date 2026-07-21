import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { technicians } from "@/db/schema";

export function requestedDuration(searchParams: URLSearchParams): number {
  const value = Number(searchParams.get("duration") || 60);
  return Number.isInteger(value) && value >= 15 && value <= 360 ? value : 60;
}

export async function findActiveTechnician(id: number) {
  const rows = await db.select().from(technicians)
    .where(and(eq(technicians.id, id), eq(technicians.active, true)))
    .limit(1);
  return rows[0] ?? null;
}
