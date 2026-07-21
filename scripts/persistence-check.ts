import { and, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { adminUsers, bookings, clients, services, technicians } from "../src/db/schema";
import { normalizePhone } from "../src/lib/validate";

const mode = process.argv[2];
const phone = "01099999999";
const phoneNormalized = normalizePhone(phone);
const name = "Persistence Restart Test";

if (process.env.DATABASE_ENVIRONMENT !== "development") {
  throw new Error("Persistence checks are restricted to the development database");
}

async function prepare() {
  const [service] = await db.select().from(services).where(eq(services.active, true)).limit(1);
  const [technician] = await db.select().from(technicians).where(eq(technicians.active, true)).limit(1);
  const [admin] = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  if (!service || !technician || !admin) throw new Error("Migrations and seed must run before persistence checks");

  const clientRows = await db.insert(clients).values({ name, phone, phoneNormalized }).onConflictDoUpdate({
    target: clients.phoneNormalized,
    set: { name, phone, updatedAt: new Date() },
  }).returning({ id: clients.id });
  await db.insert(clients).values({ name: `${name} Duplicate`, phone: `+20${phone.slice(1)}`, phoneNormalized }).onConflictDoUpdate({
    target: clients.phoneNormalized,
    set: { updatedAt: new Date() },
  });
  const count = await db.select({ value: sql<number>`count(*)::int` }).from(clients).where(eq(clients.phoneNormalized, phoneNormalized));
  if (count[0]?.value !== 1) throw new Error("Phone normalization did not prevent a duplicate client");

  await db.delete(bookings).where(and(eq(bookings.clientId, clientRows[0].id), eq(bookings.notes, "restart-persistence-check")));
  await db.insert(bookings).values({
    clientId: clientRows[0].id,
    serviceId: service.id,
    technicianId: technician.id,
    clientName: name,
    clientPhone: phone,
    service: service.name,
    extras: [],
    price: service.price,
    priceIsEstimate: service.priceMax !== null,
    bookingDate: "2099-12-31",
    bookingTime: "10:00",
    duration: service.duration,
    status: "cancelled",
    policyAcknowledged: true,
    notes: "restart-persistence-check",
  });
  console.log("PREPARED: client, service, price, admin, and booking records committed");
}

async function verifyAndClean() {
  const [client] = await db.select().from(clients).where(eq(clients.phoneNormalized, phoneNormalized)).limit(1);
  if (!client) throw new Error("Client did not survive process restart");
  const [booking] = await db.select().from(bookings).where(and(eq(bookings.clientId, client.id), eq(bookings.notes, "restart-persistence-check"))).limit(1);
  if (!booking || !booking.serviceId || booking.price === null) throw new Error("Linked booking/service/price did not survive process restart");

  await db.update(clients).set({ notes: "edited-after-restart", updatedAt: new Date() }).where(eq(clients.id, client.id));
  await db.update(bookings).set({ adminNotes: "edited-after-restart", updatedAt: new Date() }).where(eq(bookings.id, booking.id));
  const [edited] = await db.select().from(bookings).where(eq(bookings.id, booking.id)).limit(1);
  if (edited?.adminNotes !== "edited-after-restart") throw new Error("Booking edit was not persisted");

  await db.delete(bookings).where(eq(bookings.id, booking.id));
  await db.delete(clients).where(eq(clients.id, client.id));
  const [remaining] = await db.select({ value: sql<number>`count(*)::int` }).from(clients).where(eq(clients.phoneNormalized, phoneNormalized));
  if (remaining.value !== 0) throw new Error("Test client deletion failed");
  console.log("VERIFIED: restart persistence, retrieval, edits, relationships, deduplication, and guarded deletion");
}

(mode === "prepare" ? prepare() : mode === "verify" ? verifyAndClean() : Promise.reject(new Error("Use prepare or verify")))
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
