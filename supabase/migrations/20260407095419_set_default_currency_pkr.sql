-- Set PKR as system-wide default currency.

ALTER TABLE public.accounts
  ALTER COLUMN currency SET DEFAULT 'PKR';

ALTER TABLE public.transactions
  ALTER COLUMN currency SET DEFAULT 'PKR';

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
