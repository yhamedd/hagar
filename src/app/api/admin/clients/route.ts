import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, bookings, technicians } from "@/db/schema";
import { eq, desc, ilike, or, sql, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { sanitizeText, sanitizePhone, normalizePhone } from "@/lib/validate";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const clientId = searchParams.get("id");
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(searchParams.get("pageSize") || "25", 10) || 25));

  // Single client with bookings
  if (clientId) {
    const id = parseInt(clientId, 10);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const clientRows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    if (clientRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const clientBookings = await db
      .select()
      .from(bookings)
      .innerJoin(technicians, eq(bookings.technicianId, technicians.id))
      .where(eq(bookings.clientId, id))
      .orderBy(desc(bookings.bookingDate));

    return NextResponse.json({ client: clientRows[0], bookings: clientBookings });
  }

  // List all clients with optional search
  let clientList;
  const pattern = `%${search}%`;
  const filter = search
    ? or(ilike(clients.name, pattern), ilike(clients.phone, pattern), ilike(clients.phoneNormalized, `%${normalizePhone(search)}%`))
    : undefined;
  if (search) {
    clientList = await db
      .select()
      .from(clients)
      .where(filter)
      .orderBy(desc(clients.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  } else {
    clientList = await db.select().from(clients).orderBy(desc(clients.updatedAt)).limit(pageSize).offset((page - 1) * pageSize);
  }
  const totals = await db.select({ total: sql<number>`count(*)::int` }).from(clients).where(filter);

  const ids = clientList.map((client) => client.id);
  const aggregates = ids.length
    ? await db.select({
        clientId: bookings.clientId,
        totalBookings: sql<number>`count(*)::int`,
        totalSpent: sql<number>`coalesce(sum(case when ${bookings.status} in ('confirmed', 'completed') and ${bookings.priceIsEstimate} = false then ${bookings.price} else 0 end), 0)::int`,
        upcoming: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed')::int`,
      }).from(bookings).where(inArray(bookings.clientId, ids)).groupBy(bookings.clientId)
    : [];
  const byClient = new Map(aggregates.map((row) => [row.clientId, row]));
  const enriched = clientList.map((client) => ({
    ...client,
    totalBookings: byClient.get(client.id)?.totalBookings || 0,
    totalSpent: byClient.get(client.id)?.totalSpent || 0,
    upcoming: byClient.get(client.id)?.upcoming || 0,
  }));

  return NextResponse.json({ items: enriched, total: totals[0]?.total || 0, page, pageSize });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id } = body;
  if (!id || typeof id !== "number") return NextResponse.json({ error: "Client ID required" }, { status: 400 });

  const safeUpdates: Record<string, unknown> = {};
  if (typeof body.name === "string") safeUpdates.name = sanitizeText(body.name, 200);
  if (typeof body.phone === "string") {
    const phone = sanitizePhone(body.phone);
    safeUpdates.phone = phone;
    safeUpdates.phoneNormalized = normalizePhone(phone);
  }
  if (typeof body.notes === "string") safeUpdates.notes = sanitizeText(body.notes, 2000);

  if (Object.keys(safeUpdates).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });

  safeUpdates.updatedAt = new Date();
  await db.update(clients).set(safeUpdates).where(eq(clients.id, id));

  const updated = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return NextResponse.json(updated[0]);
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number.parseInt(new URL(request.url).searchParams.get("id") || "", 10);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Valid client ID is required" }, { status: 400 });
  const linked = await db.select({ count: sql<number>`count(*)::int` }).from(bookings).where(eq(bookings.clientId, id));
  if ((linked[0]?.count || 0) > 0) return NextResponse.json({ error: "Client cannot be deleted while booking history exists" }, { status: 409 });
  const removed = await db.delete(clients).where(eq(clients.id, id)).returning({ id: clients.id });
  if (!removed.length) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
