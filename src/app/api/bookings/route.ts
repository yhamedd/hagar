import { NextResponse } from "next/server";
import { db } from "@/db";
import { blockedDates, bookings, clients, services, technicians } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { cleanupStaleBookings } from "@/lib/cleanupBookings";
import { generateTimeSlots, isDayAvailable } from "@/lib/slots";
import {
  isValidDate,
  isValidTime,
  normalizePhone,
  sanitizePhone,
  sanitizeText,
} from "@/lib/validate";
import { checkRateLimit } from "@/lib/rateLimit";
import { appointmentFitsSchedule, hasBookingConflict } from "@/lib/bookingConflicts";
import { isUniqueViolation } from "@/lib/dbErrors";
import { cairoNowParts } from "@/lib/cairoTime";

const BOOKING_HORIZON_MONTHS = 12;

function dateWithinBookingHorizon(date: string) {
  const now = cairoNowParts();
  const maximum = new Date(`${now.date}T00:00:00Z`);
  maximum.setUTCMonth(maximum.getUTCMonth() + BOOKING_HORIZON_MONTHS);
  return date >= now.date && date <= maximum.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const { allowed, retryAfterSeconds } = await checkRateLimit(`booking:${ip}`);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    await cleanupStaleBookings();
    const body = await request.json();
    const technicianId = typeof body.technicianId === "number" ? body.technicianId : 0;
    const firstName = sanitizeText(body.firstName, 100);
    const lastName = sanitizeText(body.lastName, 100);
    if (!firstName || !lastName) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }
    const clientName = `${firstName} ${lastName}`;
    const clientPhone = sanitizePhone(body.clientPhone);
    const service = sanitizeText(body.service, 200);
    const bookingDate = body.bookingDate;
    const bookingTime = body.bookingTime;
    const policyAcknowledged = body.policyAcknowledged === true;
    const notes = sanitizeText(body.notes, 500) || null;
    const extras: string[] = Array.isArray(body.extras)
      ? [...new Set<string>(body.extras.map((item: unknown) => sanitizeText(item, 100)).filter(Boolean))].slice(0, 10)
      : [];

    if (!technicianId || !clientName || !clientPhone || !service || !policyAcknowledged) {
      return NextResponse.json({ error: "All required fields must be filled" }, { status: 400 });
    }
    if (!isValidDate(bookingDate) || !dateWithinBookingHorizon(bookingDate)) {
      return NextResponse.json({ error: "Choose a valid date within the next 12 months" }, { status: 400 });
    }
    if (!isValidTime(bookingTime)) {
      return NextResponse.json({ error: "Invalid time format" }, { status: 400 });
    }

    const normalizedTime = bookingTime.slice(0, 5);
    const now = cairoNowParts();
    if (bookingDate === now.date && normalizedTime <= now.time) {
      return NextResponse.json({ error: "This time has already passed" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // All starts for a technician/date share a lock so two requests can't
      // both pass the conflict check for the same slot at once.
      const lockKey = `${technicianId}:${bookingDate}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

      const techRows = await tx
        .select()
        .from(technicians)
        .where(and(eq(technicians.id, technicianId), eq(technicians.active, true)))
        .limit(1);
      const technician = techRows[0];
      if (!technician) throw new BookingError("Technician not found", 404);

      const selectedServiceRows = await tx.select().from(services).where(and(eq(services.name, service), eq(services.active, true))).limit(1);
      const selectedService = selectedServiceRows[0];
      if (!selectedService || selectedService.category !== technician.category) {
        throw new BookingError("The selected service is not available for this technician", 400);
      }
      // Extras may be true add-ons ("extras" category) or additional services from the
      // technician's own category, so clients can combine several nail services, or pair
      // a combinable lash treatment like Brow Lamination with a main lash service.
      const selectedExtras = extras.length ? await tx.select().from(services).where(and(inArray(services.name, extras), eq(services.active, true), inArray(services.category, ["extras", technician.category]))) : [];
      if (selectedExtras.length !== extras.length) {
        throw new BookingError("One or more selected extras are invalid", 400);
      }
      const duration = selectedService.duration + selectedExtras.reduce((sum, item) => sum + item.duration, 0);

      const day = new Date(`${bookingDate}T00:00:00Z`).getUTCDay();
      if (
        !isDayAvailable(technician, day) ||
        !generateTimeSlots(technician).includes(normalizedTime) ||
        !appointmentFitsSchedule(technician, normalizedTime)
      ) {
        throw new BookingError("This time is outside the technician's working schedule", 400);
      }

      const blocked = await tx
        .select({ id: blockedDates.id })
        .from(blockedDates)
        .where(and(eq(blockedDates.technicianId, technicianId), eq(blockedDates.blockedDate, bookingDate)))
        .limit(1);
      if (blocked.length) throw new BookingError("The technician is unavailable on this date", 409);

      const existing = await tx
        .select({ bookingTime: bookings.bookingTime })
        .from(bookings)
        .where(
          and(
            eq(bookings.technicianId, technicianId),
            eq(bookings.bookingDate, bookingDate),
            sql`${bookings.status} in ('confirmed', 'pending_deposit')`
          )
        )
      if (hasBookingConflict(existing, normalizedTime, technician.slotInterval || 60)) {
        throw new BookingError("This time overlaps another appointment", 409);
      }

      const normalizedPhone = normalizePhone(clientPhone);
      const clientRows = await tx
        .insert(clients)
        .values({ name: clientName, phone: clientPhone, phoneNormalized: normalizedPhone })
        .onConflictDoUpdate({
          target: clients.phoneNormalized,
          set: { name: clientName, phone: clientPhone, updatedAt: new Date() },
        })
        .returning({ id: clients.id });

      let price: number | null = selectedService.price;
      for (const extra of selectedExtras) {
        if (extra.price && price !== null) price += extra.price;
      }

      const rows = await tx
        .insert(bookings)
        .values({
          clientId: clientRows[0].id,
          serviceId: selectedService.id,
          technicianId,
          clientName,
          clientPhone,
          service,
          extras,
          price,
          priceIsEstimate: selectedService.priceMax !== null,
          bookingDate,
          bookingTime: normalizedTime,
          duration,
          status: "pending_deposit",
          policyAcknowledged,
          notes,
        })
        .returning();

      return { booking: rows[0], technicianName: technician.name };
    });

    return NextResponse.json({
      bookingId: result.booking.id,
      technicianName: result.technicianName,
      price: result.booking.price,
      duration: result.booking.duration,
      priceIsEstimate: result.booking.priceIsEstimate,
      status: result.booking.status,
      expiresAt: new Date(result.booking.createdAt.getTime() + 60 * 60 * 1000).toISOString(),
      message: "Booking created successfully!",
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (isUniqueViolation(error)) {
      return NextResponse.json({ error: "This time slot is no longer available" }, { status: 409 });
    }
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}

class BookingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
