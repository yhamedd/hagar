import { NextResponse } from "next/server";
import { db } from "@/db";
import { clients, bookings, technicians } from "@/db/schema";
import { eq, desc, ilike, or, sql } from "drizzle-orm";
import { cairoNowParts } from "@/lib/cairoTime";
import { getSession } from "@/lib/auth";
import { sanitizeText, sanitizePhone, normalizePhone, parseId } from "@/lib/validate";

const SORTS = ["recent", "name", "bookings", "spent", "upcoming", "lastBooking"] as const;
type Sort = (typeof SORTS)[number];

/**
 * Per-client booking totals. "Spent" is what the client has actually paid for:
 * completed appointments, plus confirmed ones whose date has already passed
 * (not every visit gets marked completed). Future bookings are not money spent.
 */
function clientTotals(today: string) {
  const s = bookings.status;
  const d = bookings.bookingDate;
  return db.select({
    clientId: bookings.clientId,
    totalBookings: sql<number>`count(*)::int`.as("total_bookings"),
    totalSpent: sql<number>`coalesce(sum(${bookings.price}) filter (where ${s} = 'completed' or (${s} = 'confirmed' and ${d} < ${today})), 0)::int`.as("total_spent"),
    upcoming: sql<number>`count(*) filter (where ${s} in ('pending_deposit', 'confirmed') and ${d} >= ${today})::int`.as("upcoming"),
    lastBooking: sql<string | null>`max(${d})`.as("last_booking"),
  }).from(bookings).groupBy(bookings.clientId).as("totals");
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const clientIdParam = searchParams.get("id");
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(10, Number.parseInt(searchParams.get("pageSize") || "25", 10) || 25));
  const sortParam = searchParams.get("sort") as Sort;
  const sort: Sort = SORTS.includes(sortParam) ? sortParam : "recent";
  const ascending = (searchParams.get("dir") || (sort === "name" ? "asc" : "desc")) === "asc";

  const totals = clientTotals(cairoNowParts().date);
  const columns = {
    client: clients,
    totalBookings: sql<number>`coalesce(${totals.totalBookings}, 0)`.mapWith(Number),
    totalSpent: sql<number>`coalesce(${totals.totalSpent}, 0)`.mapWith(Number),
    upcoming: sql<number>`coalesce(${totals.upcoming}, 0)`.mapWith(Number),
    lastBooking: totals.lastBooking,
  };
  type Row = { client: typeof clients.$inferSelect; totalBookings: number; totalSpent: number; upcoming: number; lastBooking: string | null };
  const flatten = (row: Row) => ({ ...row.client, totalBookings: row.totalBookings, totalSpent: row.totalSpent, upcoming: row.upcoming, lastBooking: row.lastBooking });

  // Single client with bookings
  if (clientIdParam !== null) {
    const id = parseId(clientIdParam);
    if (id === null) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const [clientRows, clientBookings] = await Promise.all([
      db.select(columns).from(clients).leftJoin(totals, eq(totals.clientId, clients.id)).where(eq(clients.id, id)).limit(1),
      db.select().from(bookings)
        .innerJoin(technicians, eq(bookings.technicianId, technicians.id))
        .where(eq(bookings.clientId, id))
        .orderBy(desc(bookings.bookingDate)),
    ]);
    if (clientRows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ client: flatten(clientRows[0]), bookings: clientBookings });
  }

  // List clients with optional search, sorted on the server so paging stays correct
  const pattern = `%${search}%`;
  const filter = search
    ? or(ilike(clients.name, pattern), ilike(clients.phone, pattern), ilike(clients.phoneNormalized, `%${normalizePhone(search)}%`))
    : undefined;
  const sortColumn = {
    recent: sql`${clients.updatedAt}`,
    name: sql`lower(${clients.name})`,
    bookings: sql`coalesce(${totals.totalBookings}, 0)`,
    spent: sql`coalesce(${totals.totalSpent}, 0)`,
    upcoming: sql`coalesce(${totals.upcoming}, 0)`,
    lastBooking: sql`${totals.lastBooking}`,
  }[sort];
  const order = ascending ? sql`${sortColumn} asc nulls last` : sql`${sortColumn} desc nulls last`;

  const [rows, counts] = await Promise.all([
    db.select(columns).from(clients).leftJoin(totals, eq(totals.clientId, clients.id)).where(filter)
      .orderBy(order, desc(clients.id)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ total: sql<number>`count(*)::int` }).from(clients).where(filter),
  ]);

  return NextResponse.json({ items: rows.map(flatten), total: counts[0]?.total || 0, page, pageSize, sort, dir: ascending ? "asc" : "desc" });
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
