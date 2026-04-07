-- Active / inactive lifecycle for offices (no hard delete).
ALTER TABLE public.offices
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.offices
  DROP CONSTRAINT IF EXISTS offices_status_check;

ALTER TABLE public.offices
  ADD CONSTRAINT offices_status_check CHECK (status IN ('active', 'inactive'));
