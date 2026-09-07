-- Technician "Nada" also stops offering "Volume 3D Refill" (follow-up to 0009,
-- which already removed "Volume 3D"). She keeps her remaining lash services.
-- No-op when Nada, the service, or the restriction row is absent.
DELETE FROM "technician_services" ts
USING "technicians" t, "services" s
WHERE ts."technician_id" = t."id"
  AND ts."service_id" = s."id"
  AND t."name" = 'Nada'
  AND s."name" = 'Volume 3D Refill';
