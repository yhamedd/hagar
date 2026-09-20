-- Technician "Marwa" no longer offers the manicure/pedicure services:
-- "Pedicure & Manicure", "Special Pedicure & Manicure", "Pedicure Hand" and
-- "Pedicure Feet". She keeps her remaining nail services.
--
-- A technician with zero technician_services rows is unrestricted, so first
-- switch Marwa to restricted mode by inserting every active nails service
-- except those four. Guarded by NOT EXISTS so it is a no-op when Marwa is
-- absent (fresh installs seed her afterwards -- see src/db/seed.ts) or when an
-- admin has already curated her service list by hand.
INSERT INTO "technician_services" ("technician_id", "service_id")
SELECT t."id", s."id"
FROM "technicians" t
CROSS JOIN "services" s
WHERE t."name" = 'Marwa'
  AND t."category" = 'nails'
  AND s."category" = 'nails'
  AND s."active" = true
  AND s."name" NOT IN ('Pedicure & Manicure', 'Special Pedicure & Manicure', 'Pedicure Hand', 'Pedicure Feet')
  AND NOT EXISTS (
    SELECT 1 FROM "technician_services" existing WHERE existing."technician_id" = t."id"
  )
ON CONFLICT ("technician_id", "service_id") DO NOTHING;
--> statement-breakpoint
-- If she was already restricted, drop any of those four services from her list.
DELETE FROM "technician_services" ts
USING "technicians" t, "services" s
WHERE ts."technician_id" = t."id"
  AND ts."service_id" = s."id"
  AND t."name" = 'Marwa'
  AND s."name" IN ('Pedicure & Manicure', 'Special Pedicure & Manicure', 'Pedicure Hand', 'Pedicure Feet');
