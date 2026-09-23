-- Correction to 0012: "Eman" is a lash technician, not a nail technician.
-- No technician_services rows exist for her, so she stays unrestricted within
-- the lashes category. No-op if she is absent or already in lashes.
UPDATE "technicians" SET "category" = 'lashes' WHERE "name" = 'Eman' AND "category" = 'nails';
