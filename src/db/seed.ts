import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { adminUsers, technicianPortalUsers, technicians } from "./schema";

const DEFAULT_TECHNICIANS = [
  { name: "Hagar", category: "lashes", slotType: "range", availableDays: [0, 1, 2, 3, 4], startTime: "13:00", endTime: "19:00", slotInterval: 60, active: true },
  { name: "Nada", category: "lashes", slotType: "fixed", availableDays: [2, 4, 6], fixedSlots: ["11:30", "13:00", "14:30", "16:00", "17:30"], active: true },
  { name: "Caroline", category: "lashes", slotType: "range", availableDays: [0, 1, 2, 3, 4, 5], startTime: "13:00", endTime: "19:00", slotInterval: 60, active: true },
  { name: "Jennifer", category: "lashes", slotType: "range", availableDays: [1, 5], startTime: "13:00", endTime: "19:00", slotInterval: 60, active: true },
  { name: "Marwa", category: "nails", slotType: "range", availableDays: [1, 2, 3, 4, 5, 6], startTime: "13:00", endTime: "21:00", slotInterval: 60, active: true },
  { name: "Habiba", category: "nails", slotType: "range", availableDays: [0, 1, 2, 3, 4, 6], startTime: "13:00", endTime: "21:00", slotInterval: 60, active: true },
  { name: "Doaa", category: "nails", slotType: "range", availableDays: [0, 1, 2, 3, 4, 6], startTime: "13:00", endTime: "21:00", slotInterval: 60, active: true },
];

async function seedAdmin() {
  const username = process.env.INITIAL_ADMIN_USERNAME?.trim() || "admin";
  const existing = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
  if (existing.length) return;

  const password = process.env.INITIAL_ADMIN_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be at least 12 characters when creating the initial admin");
  }
  await db.insert(adminUsers).values({ username, passwordHash: await bcrypt.hash(password, 12) });
}

async function seedTechnicianPortal() {
  const username = process.env.TECHNICIAN_PORTAL_USERNAME?.trim() || "technicians";
  const existing = await db.select({ id: technicianPortalUsers.id }).from(technicianPortalUsers).where(eq(technicianPortalUsers.username, username)).limit(1);
  if (existing.length) return;

  const password = process.env.TECHNICIAN_PORTAL_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("TECHNICIAN_PORTAL_PASSWORD must be at least 12 characters when creating the technician login");
  }
  await db.insert(technicianPortalUsers).values({ username, passwordHash: await bcrypt.hash(password, 12) });
}

async function seed() {
  const existingTechnicians = await db.select({ name: technicians.name }).from(technicians);
  const existingNames = new Set(existingTechnicians.map((technician) => technician.name));
  const missingTechnicians = DEFAULT_TECHNICIANS.filter((technician) => !existingNames.has(technician.name));
  if (missingTechnicians.length) await db.insert(technicians).values(missingTechnicians);
  await seedAdmin();
  await seedTechnicianPortal();
  console.log("Database seed is up to date.");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed error:", error);
    process.exit(1);
  });
