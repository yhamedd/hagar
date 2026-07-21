CREATE TABLE IF NOT EXISTS "services" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(200) NOT NULL,
  "category" varchar(20) NOT NULL,
  "price" integer,
  "price_max" integer,
  "price_label" varchar(100) NOT NULL,
  "duration" integer NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "services_category_check" CHECK ("category" in ('lashes', 'nails', 'extras')),
  CONSTRAINT "services_duration_check" CHECK ("duration" > 0),
  CONSTRAINT "services_price_check" CHECK ("price" is null or "price" >= 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "services_name_idx" ON "services" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_category_active_idx" ON "services" USING btree ("category","active");--> statement-breakpoint
INSERT INTO "services" ("name","category","price","price_max","price_label","duration","sort_order") VALUES
('Classic','lashes',1200,NULL,'1,200 EGP',120,10),
('Classic Refill','lashes',800,NULL,'800 EGP',90,20),
('Volume','lashes',1300,NULL,'1,300 EGP',120,30),
('Volume Refill','lashes',900,NULL,'900 EGP',90,40),
('Volume 3D','lashes',1500,NULL,'1,500 EGP',150,50),
('Volume 3D Refill','lashes',1000,NULL,'1,000 EGP',120,60),
('Silk Lashes','lashes',1500,2000,'1,500–2,000 EGP',150,70),
('Silk Lashes Refill','lashes',1000,1500,'1,000–1,500 EGP',120,80),
('Brow Lamination','lashes',1200,NULL,'1,200 EGP',60,90),
('Lash Lifting','lashes',1200,NULL,'1,200 EGP',60,100),
('Pedicure & Manicure','nails',500,NULL,'500 EGP',90,110),
('Special Pedicure & Manicure','nails',700,NULL,'700 EGP',120,120),
('Pedicure Hand','nails',200,NULL,'200 EGP',45,130),
('Pedicure Feet','nails',300,NULL,'300 EGP',60,140),
('New Set','nails',750,NULL,'750 EGP',90,150),
('New Set + Gel Color','nails',1250,NULL,'1,250 EGP',120,160),
('Gel Color','nails',500,NULL,'500 EGP',60,170),
('Refill (Hard or Acrylic)','nails',550,NULL,'550 EGP',90,180),
('Fake Nails + Gel Color','nails',800,NULL,'800 EGP',90,190),
('Fix without Extension','nails',50,NULL,'50 EGP',30,200),
('French or Ombre','nails',150,NULL,'150 EGP',30,210),
('Moroccan','nails',150,NULL,'150 EGP',30,220),
('Full Set of Nails (Toes)','nails',150,NULL,'150 EGP',45,230),
('Design','nails',200,NULL,'from 200 EGP',30,240),
('Remove Gel','nails',200,NULL,'200 EGP',30,250),
('Eyebrows & Moustache','extras',150,NULL,'150 EGP',30,260)
ON CONFLICT ("name") DO UPDATE SET "category"=excluded."category", "price"=excluded."price", "price_max"=excluded."price_max", "price_label"=excluded."price_label", "duration"=excluded."duration", "sort_order"=excluded."sort_order", "updated_at"=now();--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "service_id" integer;--> statement-breakpoint
UPDATE "bookings" SET "service_id" = "services"."id" FROM "services" WHERE "bookings"."service_id" IS NULL AND "bookings"."service" = "services"."name";--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "bookings" WHERE "client_id" IS NULL OR "service_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot enforce booking ownership: orphaned client or unknown service records exist';
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "client_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "service_id" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bookings_service_id_idx" ON "bookings" USING btree ("service_id");
