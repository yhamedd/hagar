import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers, technicianPortalUsers } from "@/db/schema";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? "hagar-local-development-secret-change-before-production" : undefined);
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function createToken(userId: number, username: string, sessionVersion: number) {
  return new SignJWT({ userId, username, role: "admin", sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(getJwtSecret());
}

async function verifyToken(token: string, expectedRole: "admin" | "technician" = "admin") {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.role !== expectedRole) return null;
    if (typeof payload.userId !== "number" || typeof payload.username !== "string" || typeof payload.sessionVersion !== "number") return null;
    return payload as { userId: number; username: string; role: "admin" | "technician"; sessionVersion: number };
  } catch {
    return null;
  }
}

export async function createTechnicianToken(userId: number, username: string, sessionVersion: number) {
  return new SignJWT({ userId, username, role: "technician", sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(getJwtSecret());
}

export async function getTechnicianSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("technician_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token, "technician");
  if (!payload) return null;
  const rows = await db.select({ active: technicianPortalUsers.active, sessionVersion: technicianPortalUsers.sessionVersion }).from(technicianPortalUsers).where(eq(technicianPortalUsers.id, payload.userId)).limit(1);
  return rows[0]?.active && rows[0].sessionVersion === payload.sessionVersion ? payload : null;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const rows = await db.select({ active: adminUsers.active, sessionVersion: adminUsers.sessionVersion }).from(adminUsers).where(eq(adminUsers.id, payload.userId)).limit(1);
  return rows[0]?.active && rows[0].sessionVersion === payload.sessionVersion ? payload : null;
}
