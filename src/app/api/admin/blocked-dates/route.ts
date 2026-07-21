import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedDates, technicians } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { parseId, isValidDate, sanitizeText } from "@/lib/validate";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const technicianId = parseId(searchParams.get("technicianId"));

  let results;
  if (technicianId) {
    results = await db
      .select()
      .from(blockedDates)
      .where(eq(blockedDates.technicianId, technicianId));
  } else {
    results = await db.select().from(blockedDates);
  }

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const technicianId = typeof body.technicianId === "number" ? body.technicianId : 0;
  const blockedDate = body.blockedDate;
  const reason = sanitizeText(body.reason, 255) || null;

  if (!technicianId) {
    return NextResponse.json({ error: "Technician ID is required" }, { status: 400 });
  }
  if (!isValidDate(blockedDate)) {
    return NextResponse.json({ error: "Valid date (yyyy-MM-dd) is required" }, { status: 400 });
  }

  // Verify technician exists
  const techExists = await db
    .select({ id: technicians.id })
    .from(technicians)
    .where(eq(technicians.id, technicianId))
    .limit(1);

  if (techExists.length === 0) {
    return NextResponse.json({ error: "Technician not found" }, { status: 404 });
  }

  const result = await db
    .insert(blockedDates)
    .values({ technicianId, blockedDate, reason })
    .onConflictDoUpdate({
      target: [blockedDates.technicianId, blockedDates.blockedDate],
      set: { reason },
    })
    .returning();

  return NextResponse.json(result[0]);
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = parseId(searchParams.get("id"));

  if (!id) {
    return NextResponse.json({ error: "Valid ID is required" }, { status: 400 });
  }

  await db.delete(blockedDates).where(eq(blockedDates.id, id));

  return NextResponse.json({ success: true });
}
