import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { blockedDates, technicians } from "../src/db/schema";
import { cairoNowParts } from "../src/lib/cairoTime";

function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function blockUntil() {
  const firstBookableDate = process.env.FIRST_BOOKABLE_DATE?.trim();
  if (!firstBookableDate || !/^\d{4}-\d{2}-\d{2}$/.test(firstBookableDate)) {
    throw new Error("FIRST_BOOKABLE_DATE must be set to a yyyy-MM-dd date");
  }

  const today = cairoNowParts().date;
  const allTechnicians = await db.select({ id: technicians.id }).from(technicians).where(eq(technicians.active, true));

  const dates: string[] = [];
  for (let date = today; date < firstBookableDate; date = addDays(date, 1)) {
    dates.push(date);
  }

  if (!dates.length) {
    console.log(`Nothing to block: ${firstBookableDate} is today or in the past.`);
    return;
  }

  const rows = allTechnicians.flatMap((technician) =>
    dates.map((blockedDate) => ({ technicianId: technician.id, blockedDate, reason: "Closed until reopening" }))
  );

  for (const row of rows) {
    await db.insert(blockedDates).values(row).onConflictDoUpdate({
      target: [blockedDates.technicianId, blockedDates.blockedDate],
      set: { reason: row.reason },
    });
  }

  console.log(`Blocked ${dates.length} day(s) (${dates[0]} through ${dates[dates.length - 1]}) for ${allTechnicians.length} technician(s). First bookable date: ${firstBookableDate}.`);
}

blockUntil()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Block-until error:", error);
    process.exit(1);
  });
