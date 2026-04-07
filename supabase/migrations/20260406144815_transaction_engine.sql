-- Transaction engine: public numbers TRX-YYYY-#####, atomic create RPC, optional reversal RPC.
-- Workflow remains PENDING -> APPROVED -> POSTED (application + RLS).

-- ---------------------------------------------------------------------------
-- Sequence for TRX-YYYY-#####
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_number_sequences (
  year int PRIMARY KEY,
  last_value int NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.alloc_transaction_number()
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  y int := (extract(year from timezone('utc', now())))::int;
  n int;
BEGIN
  INSERT INTO public.transaction_number_sequences (year, last_value)
  VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_value = public.transaction_number_sequences.last_value + 1
  RETURNING last_value INTO n;

  RETURN format('TRX-%s-%s', y, lpad(n::text, 5, '0'));
END;
$$;

-- ---------------------------------------------------------------------------
-- transactions.transaction_number
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transaction_number text;

UPDATE public.transactions
SET transaction_number = 'legacy-' || id::text
WHERE transaction_number IS NULL;

ALTER TABLE public.transactions
  ALTER COLUMN transaction_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_transaction_number_key
  ON public.transactions (transaction_number);

-- ---------------------------------------------------------------------------
-- Atomic create: header + lines in one DB transaction (implicit in function).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_transaction_create(
  p_office_id uuid,
  p_type public.transaction_type,
  p_currency text,
  p_description text,
  p_transaction_date date,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tid uuid := uuid_generate_v4();
  v_num text;
  el jsonb;
  i int := 0;
  v_debit numeric(24, 6) := 0;
  v_credit numeric(24, 6) := 0;
  d numeric(24, 6);
  c numeric(24, 6);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.office_row_visible(p_office_id) THEN
    RAISE EXCEPTION 'Office not accessible';
  END IF;

  IF NOT (public.is_admin() OR public.is_accountant()) THEN
    RAISE EXCEPTION 'Insufficient permissions to create transactions';
  END IF;

  IF p_type = 'REVERSAL' THEN
    RAISE EXCEPTION 'Use fn_transaction_reversal for reversals';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 2 THEN
    RAISE EXCEPTION 'At least two line items are required';
  END IF;

  FOR el IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    d := coalesce((el->>'debit')::numeric, 0);
    c := coalesce((el->>'credit')::numeric, 0);
    v_debit := v_debit + d;
    v_credit := v_credit + c;
  END LOOP;

  IF v_debit <> v_credit THEN
    RAISE EXCEPTION 'Transaction must balance: debit % <> credit %', v_debit, v_credit;
  END IF;

  v_num := public.alloc_transaction_number();

  INSERT INTO public.transactions (
    id,
    created_by,
    office_id,
    type,
    status,
    currency,
    description,
    transaction_number,
    transaction_date,
    metadata
  ) VALUES (
    v_tid,
    v_uid,
    p_office_id,
    p_type,
    'PENDING',
    coalesce(nullif(trim(p_currency), ''), 'PKR'),
    p_description,
    v_num,
    coalesce(p_transaction_date, (timezone('utc', now()))::date),
    '{}'::jsonb
  );

  FOR el IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    i := i + 1;
    INSERT INTO public.transaction_items (
      created_by,
      transaction_id,
      account_id,
      line_number,
      debit,
      credit,
      description
    ) VALUES (
      v_uid,
      v_tid,
      (el->>'account_id')::uuid,
      coalesce(nullif((el->>'line_number'), '')::int, i),
      coalesce((el->>'debit')::numeric, 0),
      coalesce((el->>'credit')::numeric, 0),
      nullif(trim(el->>'description'), '')
    );
  END LOOP;

  RETURN v_tid;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_transaction_reversal(
  p_original_transaction_id uuid,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_orig record;
  v_tid uuid := uuid_generate_v4();
  v_num text;
  r record;
  i int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (public.is_admin() OR public.is_accountant()) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT * INTO v_orig
  FROM public.transactions
  WHERE id = p_original_transaction_id;

  IF v_orig.id IS NULL THEN
    RAISE EXCEPTION 'Original transaction not found';
  END IF;

  IF NOT public.office_row_visible(v_orig.office_id) THEN
    RAISE EXCEPTION 'Office not accessible';
  END IF;

  IF v_orig.status <> 'POSTED' THEN
    RAISE EXCEPTION 'Only POSTED transactions can be reversed';
  END IF;

  IF v_orig.is_reversed THEN
    RAISE EXCEPTION 'Transaction already reversed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.transaction_items ti
    WHERE ti.transaction_id = p_original_transaction_id
  ) THEN
    RAISE EXCEPTION 'Original transaction has no line items';
  END IF;

  v_num := public.alloc_transaction_number();

  INSERT INTO public.transactions (
    id,
    created_by,
    office_id,
    type,
    status,
    currency,
    description,
    transaction_number,
    transaction_date,
    reversal_of_transaction_id,
    metadata
  ) VALUES (
    v_tid,
    v_uid,
    v_orig.office_id,
    'REVERSAL',
    'PENDING',
    v_orig.currency,
    coalesce(nullif(trim(p_description), ''), 'Reversal of ' || v_orig.transaction_number),
    v_num,
    (timezone('utc', now()))::date,
    p_original_transaction_id,
    '{}'::jsonb
  );

  FOR r IN
    SELECT account_id, debit, credit, description
    FROM public.transaction_items
    WHERE transaction_id = p_original_transaction_id
    ORDER BY line_number
  LOOP
    i := i + 1;
    INSERT INTO public.transaction_items (
      created_by,
      transaction_id,
      account_id,
      line_number,
      debit,
      credit,
      description
    ) VALUES (
      v_uid,
      v_tid,
      r.account_id,
      i,
      r.debit,
      r.credit,
      r.description
    );
  END LOOP;

  RETURN v_tid;
END;
$$;

-- ---------------------------------------------------------------------------
-- Approve (manager) and post (accountant / manager / admin) — single atomic RPC each.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_transaction_approve(
  p_transaction_id uuid,
  p_comment text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_office_id uuid;
  v_status public.transaction_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_manager() THEN
    RAISE EXCEPTION 'Only managers can approve';
  END IF;

  SELECT office_id, status INTO v_office_id, v_status
  FROM public.transactions
  WHERE id = p_transaction_id;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF NOT public.office_row_visible(v_office_id) THEN
    RAISE EXCEPTION 'Office not accessible';
  END IF;

  IF v_status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only PENDING transactions can be approved';
  END IF;

  INSERT INTO public.approvals (
    created_by,
    transaction_id,
    approver_user_id,
    status,
    decided_at,
    comment
  ) VALUES (
    v_uid,
    p_transaction_id,
    v_uid,
    'APPROVED',
    timezone('utc', now()),
    nullif(trim(p_comment), '')
  );

  UPDATE public.transactions
  SET status = 'APPROVED',
      updated_at = timezone('utc', now())
  WHERE id = p_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_transaction_post(
  p_transaction_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_office_id uuid;
  v_status public.transaction_status;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (public.is_admin() OR public.is_accountant() OR public.is_manager()) THEN
    RAISE EXCEPTION 'Cannot post';
  END IF;

  SELECT office_id, status INTO v_office_id, v_status
  FROM public.transactions
  WHERE id = p_transaction_id;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF NOT public.office_row_visible(v_office_id) THEN
    RAISE EXCEPTION 'Office not accessible';
  END IF;

  IF v_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Only APPROVED transactions can be posted';
  END IF;

  UPDATE public.transactions
  SET status = 'POSTED',
      updated_at = timezone('utc', now())
  WHERE id = p_transaction_id;
END;
$$;

REVOKE ALL ON FUNCTION public.alloc_transaction_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_transaction_create(uuid, public.transaction_type, text, text, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transaction_reversal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transaction_approve(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_transaction_post(uuid) TO authenticated;
