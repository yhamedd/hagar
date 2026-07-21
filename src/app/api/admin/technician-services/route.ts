import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { services, technicianServices, technicians } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { parseId } from "@/lib/validate";

// A technician with zero rows here is unrestricted (can perform any service
// in their own category); PUT-ing an empty list removes all restrictions.
export async function GET(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const technicianId = parseId(new URL(request.url).searchParams.get("technicianId"));
  if (!technicianId) return NextResponse.json({ error: "Valid technicianId is required" }, { status: 400 });
  const rows = await db.select({ serviceId: technicianServices.serviceId }).from(technicianServices).where(eq(technicianServices.technicianId, technicianId));
  return NextResponse.json({ serviceIds: rows.map((row) => row.serviceId) });
}

export async function PUT(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const technicianId = typeof body.technicianId === "number" ? body.technicianId : 0;
  const rawServiceIds: unknown[] = Array.isArray(body.serviceIds) ? body.serviceIds : [];
  const serviceIds: number[] = [...new Set(rawServiceIds.filter((id): id is number => typeof id === "number"))];
  if (!technicianId) return NextResponse.json({ error: "Valid technicianId is required" }, { status: 400 });

  const techRows = await db.select({ category: technicians.category }).from(technicians).where(eq(technicians.id, technicianId)).limit(1);
  const technician = techRows[0];
  if (!technician) return NextResponse.json({ error: "Technician not found" }, { status: 404 });

  if (serviceIds.length) {
    const matching = await db.select({ id: services.id }).from(services).where(and(inArray(services.id, serviceIds), eq(services.category, technician.category)));
    if (matching.length !== serviceIds.length) {
      return NextResponse.json({ error: "One or more services don't belong to this technician's category" }, { status: 400 });
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(technicianServices).where(eq(technicianServices.technicianId, technicianId));
    if (serviceIds.length) {
      await tx.insert(technicianServices).values(serviceIds.map((serviceId) => ({ technicianId, serviceId })));
    }
  });

  return NextResponse.json({ success: true, serviceIds });
}
