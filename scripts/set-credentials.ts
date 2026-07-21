import bcrypt from "bcryptjs";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { adminUsers, technicianPortalUsers } from "../src/db/schema";

async function setAdminCredentials() {
  const username = process.env.NEW_ADMIN_USERNAME?.trim();
  const password = process.env.NEW_ADMIN_PASSWORD;
  if (!username || !password) return;
  if (password.length < 12) throw new Error("NEW_ADMIN_PASSWORD must be at least 12 characters");

  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).orderBy(asc(adminUsers.id)).limit(1);
  if (existing) {
    await db.update(adminUsers).set({ username, passwordHash, active: true, sessionVersion: sql`${adminUsers.sessionVersion} + 1` }).where(eq(adminUsers.id, existing.id));
  } else {
    await db.insert(adminUsers).values({ username, passwordHash });
  }
  console.log(`Admin credentials updated for username "${username}"`);
}

async function setTechnicianPortalCredentials() {
  const username = process.env.NEW_TECHNICIAN_PORTAL_USERNAME?.trim();
  const password = process.env.NEW_TECHNICIAN_PORTAL_PASSWORD;
  if (!username || !password) return;
  if (password.length < 12) throw new Error("NEW_TECHNICIAN_PORTAL_PASSWORD must be at least 12 characters");

  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db.select({ id: technicianPortalUsers.id }).from(technicianPortalUsers).orderBy(asc(technicianPortalUsers.id)).limit(1);
  if (existing) {
    await db.update(technicianPortalUsers).set({ username, passwordHash, active: true, updatedAt: new Date(), sessionVersion: sql`${technicianPortalUsers.sessionVersion} + 1` }).where(eq(technicianPortalUsers.id, existing.id));
  } else {
    await db.insert(technicianPortalUsers).values({ username, passwordHash });
  }
  console.log(`Technician portal credentials updated for username "${username}"`);
}

Promise.all([setAdminCredentials(), setTechnicianPortalCredentials()])
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Credential update error:", error);
    process.exit(1);
  });
