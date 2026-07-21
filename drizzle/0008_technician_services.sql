CREATE TABLE IF NOT EXISTS "technician_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"technician_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "technician_services" ADD CONSTRAINT "technician_services_technician_id_technicians_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "technician_services" ADD CONSTRAINT "technician_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "technician_services_unique_idx" ON "technician_services" USING btree ("technician_id","service_id");
