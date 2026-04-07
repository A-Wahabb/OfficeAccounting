-- Daily cash closing: domain field names, closed_by, RLS.
-- Unique (office_id, closing_date) already prevents duplicate closings.

ALTER TABLE public.cash_closings RENAME COLUMN opening_cash TO opening_balance;
ALTER TABLE public.cash_closings RENAME COLUMN closing_cash TO closing_balance;
ALTER TABLE public.cash_closings RENAME COLUMN variance TO difference;

ALTER TABLE public.cash_closings
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES public.users (id) ON DELETE RESTRICT;

UPDATE public.cash_closings c
SET closed_by = c.created_by
WHERE c.closed_by IS NULL
  AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = c.created_by);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cash_closings WHERE closed_by IS NULL) THEN
    ALTER TABLE public.cash_closings ALTER COLUMN closed_by SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY cash_closings_select ON public.cash_closings
FOR SELECT TO authenticated
USING (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);

CREATE POLICY cash_closings_insert ON public.cash_closings
FOR INSERT TO authenticated
WITH CHECK (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
  AND created_by = (SELECT auth.uid())
  AND closed_by = (SELECT auth.uid())
);

CREATE POLICY cash_closings_update ON public.cash_closings
FOR UPDATE TO authenticated
USING (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
)
WITH CHECK (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);
