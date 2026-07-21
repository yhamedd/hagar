import { NextResponse } from "next/server";
import { getTechnicianSession } from "@/lib/auth";

export async function GET() {
  const session = await getTechnicianSession();
  return NextResponse.json({ authenticated: Boolean(session) });
}
