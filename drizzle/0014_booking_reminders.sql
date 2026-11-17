-- Records when the salon last sent a client a WhatsApp reminder for a booking,
-- so the admin dashboard can show who has already been reminded.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp;
