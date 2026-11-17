import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getSession } from "@/lib/auth";

/**
 * Marks a booking as reminded, or clears that mark with `{ sent: false }`
 * (for when WhatsApp was opened but the message was never sent). The WhatsApp message itself is sent from the
 * admin's own WhatsApp via a click-to-chat link; this only records that it
 * happened so the dashboard can show "Reminded" next to the booking.
 */
export async function POST(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const id = Number.isInteger(body?.id) && body.id > 0 ? (body.id as number) : 0;
    if (!id) return NextResponse.json({ error: "Valid booking ID is required" }, { status: 400 });

    const reminderSentAt = body?.sent === false ? null : new Date();
    const updated = await db.update(bookings).set({ reminderSentAt }).where(eq(bookings.id, id)).returning({ id: bookings.id });
    if (!updated.length) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json({ success: true, reminderSentAt: reminderSentAt?.toISOString() ?? null });
  } catch (error) {
    console.error("Reminder update error:", error);
    return NextResponse.json({ error: "Could not record reminder" }, { status: 500 });
  }
}
