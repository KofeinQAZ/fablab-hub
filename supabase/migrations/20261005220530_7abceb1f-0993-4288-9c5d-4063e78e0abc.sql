ALTER TABLE public.equipment ADD COLUMN map_slot integer CHECK (map_slot BETWEEN 1 AND 3);
CREATE UNIQUE INDEX equipment_map_slot_unique ON public.equipment(map_slot) WHERE map_slot IS NOT NULL;