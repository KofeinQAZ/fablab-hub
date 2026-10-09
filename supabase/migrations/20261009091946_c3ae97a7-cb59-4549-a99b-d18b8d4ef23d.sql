ALTER TABLE public.filaments ADD COLUMN density numeric NOT NULL DEFAULT 1.24;
UPDATE public.filaments SET density = 1.27 WHERE material ILIKE 'PETG%';
ALTER TABLE public.print_zone_settings
  ADD COLUMN print_speed_gph numeric NOT NULL DEFAULT 12,
  ADD COLUMN weight_factor numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN shell_ratio numeric NOT NULL DEFAULT 0.25,
  ADD COLUMN default_density numeric NOT NULL DEFAULT 1.24;
ALTER TABLE public.print_requests
  ADD COLUMN infill integer,
  ADD COLUMN volume_cm3 numeric,
  ADD COLUMN est_grams numeric,
  ADD COLUMN est_minutes integer;