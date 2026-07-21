ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "price_is_estimate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "management_token_hash" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_management_token_hash_unique" ON "bookings" USING btree ("management_token_hash");
