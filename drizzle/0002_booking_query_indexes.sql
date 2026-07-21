CREATE INDEX IF NOT EXISTS "bookings_status_date_idx" ON "bookings" USING btree ("status","booking_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_date_time_idx" ON "bookings" USING btree ("booking_date","booking_time");
