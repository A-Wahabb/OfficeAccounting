-- Company-wide opening for shared chart lines (office_id IS NULL).
-- Transaction activity still lives in account_balances per office; totals add both.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS opening_balance numeric(24, 6) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.accounts.opening_balance IS
  'Single opening amount for shared accounts (office_id IS NULL). For office-scoped accounts this stays 0; opening is applied via account_balances for that office.';
