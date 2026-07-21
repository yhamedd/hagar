import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { createToken } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  try {
    // --- Rate limiting ---
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const { allowed, retryAfterSeconds } = await checkRateLimit(`login:${ip}`);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Truncate to prevent DoS with extremely long strings
    const safeUser = username.trim().slice(0, 100);
    const safePwd = password.slice(0, 200);

    const users = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, safeUser))
      .limit(1);

    if (users.length === 0) {
      // Constant-time: still run bcrypt compare to prevent timing-based user enumeration
      await bcrypt.compare(safePwd, "$2a$10$placeholder.hash.for.timing.attack.prevention");
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(safePwd, user.passwordHash);

    if (!validPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.active) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    const token = await createToken(user.id, user.username, user.sessionVersion);

    const response = NextResponse.json({ success: true, username: user.username });
    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
