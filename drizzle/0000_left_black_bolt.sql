CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "blocked_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"technician_id" integer NOT NULL,
	"blocked_date" date NOT NULL,
	"reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"technician_id" integer NOT NULL,
	"client_name" varchar(200) NOT NULL,
	"client_phone" varchar(50) NOT NULL,
	"service" varchar(200) NOT NULL,
	"extras" jsonb DEFAULT '[]'::jsonb,
	"price" integer,
	"booking_date" date NOT NULL,
	"booking_time" time NOT NULL,
	"duration" integer DEFAULT 60,
	"status" varchar(30) DEFAULT 'pending_deposit' NOT NULL,
	"policy_acknowledged" boolean DEFAULT false NOT NULL,
	"notes" text,
	"admin_notes" text,
	"google_event_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_status_check" CHECK ("bookings"."status" in ('pending_deposit', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')),
	CONSTRAINT "bookings_duration_check" CHECK ("bookings"."duration" is null or "bookings"."duration" > 0),
	CONSTRAINT "bookings_price_check" CHECK ("bookings"."price" is null or "bookings"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"phone_normalized" varchar(30) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "technicians" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(20) NOT NULL,
	"photo_url" text,
	"slot_type" varchar(10) DEFAULT 'range' NOT NULL,
	"available_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_time" time,
	"end_time" time,
	"slot_interval" integer DEFAULT 60,
	"fixed_slots" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "technicians_category_check" CHECK ("technicians"."category" in ('lashes', 'nails')),
	CONSTRAINT "technicians_slot_type_check" CHECK ("technicians"."slot_type" in ('range', 'fixed')),
	CONSTRAINT "technicians_slot_interval_check" CHECK ("technicians"."slot_interval" is null or "technicians"."slot_interval" between 5 and 480)
);
--> statement-breakpoint
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_dates_technician_date_idx" ON "blocked_dates" USING btree ("technician_id","blocked_date");--> statement-breakpoint
CREATE INDEX "bookings_technician_date_idx" ON "bookings" USING btree ("technician_id","booking_date");--> statement-breakpoint
CREATE INDEX "bookings_client_id_idx" ON "bookings" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_active_slot_idx" ON "bookings" USING btree ("technician_id","booking_date","booking_time") WHERE "bookings"."status" in ('pending_deposit', 'confirmed');--> statement-breakpoint
CREATE UNIQUE INDEX "clients_phone_normalized_idx" ON "clients" USING btree ("phone_normalized");