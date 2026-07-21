ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "technician_portal_users" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 1 NOT NULL;
