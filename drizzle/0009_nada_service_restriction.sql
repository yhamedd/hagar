-- Technician "Nada" no longer offers the "Volume 3D" lash service.
--
-- A technician with zero technician_services rows is unrestricted; adding rows
-- switches her to "restricted" mode where only the listed services are bookable.
-- We insert every currently active lash service EXCEPT "Volume 3D".
--
-- Guarded by NOT EXISTS so this is a no-op when Nada is absent (fresh installs
-- seed her afterwards -- see src/db/seed.ts, which applies the same rule) or
-- when an admin has already curated her service list by hand.
INSERT INTO "technician_services" ("technician_id", "service_id")
SELECT t."id", s."id"
FROM "technicians" t
CROSS JOIN "services" s
WHERE t."name" = 'Nada'
  AND t."category" = 'lashes'
  AND s."category" = 'lashes'
  AND s."active" = true
  AND s."name" <> 'Volume 3D'
  AND NOT EXISTS (
    SELECT 1 FROM "technician_services" existing WHERE existing."technician_id" = t."id"
  )
ON CONFLICT ("technician_id", "service_id") DO NOTHING;
