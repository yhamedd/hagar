import { NextResponse } from "next/server";
import { and, asc, eq, gte, inArray, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, technicians } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { cairoNowParts } from "@/lib/cairoTime";
import { cleanupStaleBookings, DEPOSIT_HOLD_MS } from "@/lib/cleanupBookings";
import { shiftDate } from "@/lib/dates";

/**
 * Everything the admin overview needs in one round trip: headline numbers,
 * all-time per-technician totals, and the three working lists (today,
 * tomorrow, deposits awaiting confirmation). All dates are salon-local (Cairo).
 */
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await cleanupStaleBookings();

  const today = cairoNowParts().date;
  const tomorrow = shiftDate(today, 1);
  const monthStart = `${today.slice(0, 7)}-01`;
  const nextMonthStart = shiftDate(monthStart, 32).slice(0, 7) + "-01";

  const d = bookings.bookingDate;
  const s = bookings.status;
  const earned = sql`${s} in ('confirmed', 'completed')`;
  const inMonth = sql`${d} >= ${monthStart} and ${d} < ${nextMonthStart}`;

  const [kpiRows, perTechnician, listRows] = await Promise.all([
    db.select({
      todayCount: sql<number>`count(*) filter (where ${d} = ${today} and ${s} in ('pending_deposit', 'confirmed', 'completed'))::int`,
      todayRevenue: sql<number>`coalesce(sum(${bookings.price}) filter (where ${d} = ${today} and ${earned}), 0)::int`,
      pendingDeposits: sql<number>`count(*) filter (where ${s} = 'pending_deposit')::int`,
      upcoming: sql<number>`count(*) filter (where ${s} = 'confirmed' and ${d} >= ${today})::int`,
      monthBookings: sql<number>`count(*) filter (where ${inMonth} and ${s} in ('pending_deposit', 'confirmed', 'completed'))::int`,
      monthRevenue: sql<number>`coalesce(sum(${bookings.price}) filter (where ${inMonth} and ${earned}), 0)::int`,
      monthNoShows: sql<number>`count(*) filter (where ${inMonth} and ${s} = 'no_show')::int`,
      remindersDue: sql<number>`count(*) filter (where ${d} = ${tomorrow} and ${s} in ('pending_deposit', 'confirmed') and ${bookings.reminderSentAt} is null)::int`,
    }).from(bookings).where(or(gte(d, monthStart), eq(s, "pending_deposit"))),

    db.select({
      technicianId: bookings.technicianId,
      completed: sql<number>`count(*) filter (where ${s} = 'completed')::int`,
      upcoming: sql<number>`count(*) filter (where ${s} = 'confirmed' and ${d} >= ${today})::int`,
      clients: sql<number>`count(distinct ${bookings.clientId})::int`,
      revenue: sql<number>`coalesce(sum(${bookings.price}) filter (where ${earned}), 0)::int`,
    }).from(bookings).groupBy(bookings.technicianId),

    db.select().from(bookings).innerJoin(technicians, eq(bookings.technicianId, technicians.id))
      .where(or(
        and(inArray(d, [today, tomorrow]), notInArray(s, ["cancelled", "rescheduled"])),
        eq(s, "pending_deposit")
      ))
      .orderBy(asc(d), asc(bookings.bookingTime))
      .limit(500),
  ]);

  return NextResponse.json({
    today,
    tomorrow,
    depositHoldMs: DEPOSIT_HOLD_MS,
    kpis: kpiRows[0],
    technicians: perTechnician,
    lists: {
      today: listRows.filter((row) => row.bookings.bookingDate === today),
      tomorrow: listRows.filter((row) => row.bookings.bookingDate === tomorrow),
      pending: listRows.filter((row) => row.bookings.status === "pending_deposit"),
    },
  });
}
