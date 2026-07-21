import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { technicianPortalUsers } from "@/db/schema";
import { createTechnicianToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const limit = await checkRateLimit(`technician-login:${ip}`);
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many attempts. Please wait and try again." }, { status: 429 });
    }

    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim().slice(0, 100) : "";
    const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const rows = await db.select().from(technicianPortalUsers)
      .where(eq(technicianPortalUsers.username, username)).limit(1);
    const account = rows[0];
    const valid = account?.active && await bcrypt.compare(password, account.passwordHash);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await createTechnicianToken(account.id, account.username, account.sessionVersion);
    const response = NextResponse.json({ success: true });
    response.cookies.set("technician_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Technician login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
