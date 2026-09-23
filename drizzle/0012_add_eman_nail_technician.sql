-- New nail technician "Eman": Sundays and Mondays at fixed slots 13:00, 14:30
-- and 16:00. No technician_services rows, so she can perform every nails service.
-- No-op if a technician named Eman already exists.
INSERT INTO "technicians" ("name", "category", "slot_type", "available_days", "fixed_slots", "active")
SELECT 'Eman', 'nails', 'fixed', '[0,1]'::jsonb, '["13:00","14:30","16:00"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "technicians" WHERE "name" = 'Eman');
