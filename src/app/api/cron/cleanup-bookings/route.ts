import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { runStaleBookingCleanup } from "@/lib/cleanupBookings";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cancelled = await runStaleBookingCleanup();
  return NextResponse.json({ ok: true, cancelled });
}

// Accept both so the endpoint works with schedulers that only issue GET
// (uptime pingers, cron-job.org) and those that prefer POST (GitHub Actions).
export const GET = handle;
export const POST = handle;
