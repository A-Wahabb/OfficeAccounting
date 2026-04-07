-- Chart of accounts: account_type (CASH, BANK, …) replaces legacy account_category.
-- Balance updates on POSTED transactions remain in apply_posted_transaction (core migration).

CREATE TYPE public.account_type AS ENUM (
  'CASH',
  'BANK',
  'EXPENSE',
  'REVENUE',
  'ASSET',
  'LIABILITY',
  'EQUITY'
);

ALTER TABLE public.accounts ADD COLUMN account_type public.account_type;

UPDATE public.accounts
SET account_type = (
  CASE category::text
    WHEN 'ASSET' THEN 'ASSET'
    WHEN 'LIABILITY' THEN 'LIABILITY'
    WHEN 'EQUITY' THEN 'EQUITY'
    WHEN 'REVENUE' THEN 'REVENUE'
    WHEN 'EXPENSE' THEN 'EXPENSE'
    ELSE 'ASSET'
  END
)::public.account_type;

ALTER TABLE public.accounts ALTER COLUMN account_type SET NOT NULL;

ALTER TABLE public.accounts DROP COLUMN category;

DROP TYPE public.account_category;

DROP INDEX IF EXISTS accounts_category_idx;
CREATE INDEX accounts_account_type_idx ON public.accounts (account_type);
