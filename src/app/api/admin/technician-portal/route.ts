import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { technicianPortalUsers } from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select({ username: technicianPortalUsers.username, active: technicianPortalUsers.active })
    .from(technicianPortalUsers).orderBy(asc(technicianPortalUsers.id)).limit(1);
  return NextResponse.json(rows[0] || null);
}

export async function PUT(request: Request) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const username = typeof body.username === "string" ? body.username.trim().slice(0, 100) : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username) return NextResponse.json({ error: "Username is required" }, { status: 400 });
  if (password && password.length < 12) {
    return NextResponse.json({ error: "Password must be at least 12 characters" }, { status: 400 });
  }
  const rows = await db.select().from(technicianPortalUsers).orderBy(asc(technicianPortalUsers.id)).limit(1);
  const values: Record<string, unknown> = { username, active: body.active !== false, updatedAt: new Date() };
  // Only invalidate existing sessions when the password actually changes; a plain
  // username/active edit shouldn't force the whole shared technician login to sign back in.
  if (password) {
    values.passwordHash = await bcrypt.hash(password, 12);
    values.sessionVersion = sql`${technicianPortalUsers.sessionVersion} + 1`;
  }
  if (rows[0]) {
    await db.update(technicianPortalUsers).set(values).where(eq(technicianPortalUsers.id, rows[0].id));
  } else {
    if (!password) return NextResponse.json({ error: "A password is required for initial setup" }, { status: 400 });
    await db.insert(technicianPortalUsers).values({ username, passwordHash: values.passwordHash as string });
  }
  return NextResponse.json({ success: true, username });
}
