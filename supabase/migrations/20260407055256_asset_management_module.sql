-- Asset management: kind (EQUIPMENT/COMPUTER/PROPERTY), purchase & current value (manual depreciation),
-- lifecycle event log (purchase, transfer, maintenance, disposal).

CREATE TYPE public.asset_kind AS ENUM (
  'EQUIPMENT',
  'COMPUTER',
  'PROPERTY'
);

CREATE TYPE public.asset_lifecycle_event_kind AS ENUM (
  'PURCHASE',
  'TRANSFER',
  'MAINTENANCE',
  'DISPOSAL'
);

-- Rename legacy cost → purchase_value (manual book value at acquisition).
ALTER TABLE public.assets RENAME COLUMN cost TO purchase_value;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS asset_kind public.asset_kind NOT NULL DEFAULT 'EQUIPMENT';

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS current_value numeric(24, 6) NOT NULL DEFAULT 0;

UPDATE public.assets
SET current_value = purchase_value
WHERE current_value = 0;

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS disposed_at date;

-- ---------------------------------------------------------------------------
-- Lifecycle events (append-only; no UPDATE policy)
-- ---------------------------------------------------------------------------
CREATE TABLE public.asset_lifecycle_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  asset_id uuid NOT NULL REFERENCES public.assets (id) ON DELETE RESTRICT,
  kind public.asset_lifecycle_event_kind NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  notes text,
  from_office_id uuid REFERENCES public.offices (id) ON DELETE RESTRICT,
  to_office_id uuid REFERENCES public.offices (id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX asset_lifecycle_events_asset_id_idx
  ON public.asset_lifecycle_events (asset_id);

CREATE INDEX asset_lifecycle_events_occurred_idx
  ON public.asset_lifecycle_events (occurred_at DESC);

CREATE TRIGGER asset_lifecycle_events_prevent_delete
  BEFORE DELETE ON public.asset_lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();

CREATE TRIGGER asset_lifecycle_events_audit
  AFTER INSERT ON public.asset_lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

ALTER TABLE public.asset_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_lifecycle_events_select ON public.asset_lifecycle_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.assets a
    WHERE a.id = asset_lifecycle_events.asset_id
      AND public.has_accounting_role()
      AND public.office_row_visible(a.office_id)
  )
);

CREATE POLICY asset_lifecycle_events_insert ON public.asset_lifecycle_events
FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.assets a
    WHERE a.id = asset_lifecycle_events.asset_id
      AND public.has_accounting_role()
      AND public.office_row_visible(a.office_id)
  )
  AND (
    from_office_id IS NULL
    OR public.office_row_visible(from_office_id)
  )
  AND (
    to_office_id IS NULL
    OR public.office_row_visible(to_office_id)
  )
);