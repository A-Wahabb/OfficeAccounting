-- File created with: supabase migration new multi_office_accounting_core
--
-- Multi-office accounting core schema
-- Requires: Supabase (PostgreSQL), auth.users
-- No DELETE: enforced by triggers; corrections via REVERSAL transactions.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.transaction_type AS ENUM (
  'RECEIPT',
  'PAYMENT',
  'TRANSFER',
  'DEPOSIT',
  'WITHDRAWAL',
  'REVERSAL'
);

CREATE TYPE public.transaction_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'POSTED'
);

CREATE TYPE public.approval_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE public.cash_closing_status AS ENUM (
  'DRAFT',
  'LOCKED'
);

CREATE TYPE public.bank_reconciliation_status AS ENUM (
  'PENDING',
  'RECONCILED',
  'VOID'
);

CREATE TYPE public.account_category AS ENUM (
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE'
);

CREATE TYPE public.audit_operation AS ENUM (
  'INSERT',
  'UPDATE'
);

-- ---------------------------------------------------------------------------
-- Helper: timestamps
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Offices (exactly one head office; enforced below)
-- ---------------------------------------------------------------------------
CREATE TABLE public.offices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  is_head_office boolean NOT NULL DEFAULT false,
  parent_office_id uuid REFERENCES public.offices (id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT offices_code_unique UNIQUE (code),
  CONSTRAINT offices_parent_not_self CHECK (parent_office_id IS DISTINCT FROM id)
);

CREATE UNIQUE INDEX offices_one_head_only
  ON public.offices (is_head_office)
  WHERE is_head_office;

CREATE INDEX offices_parent_office_id_idx ON public.offices (parent_office_id);

CREATE TRIGGER offices_set_updated_at
  BEFORE UPDATE ON public.offices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Users (application profile; 1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  display_name text,
  email text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX users_created_by_idx ON public.users (created_by);

CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Roles & user_roles
-- ---------------------------------------------------------------------------
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  CONSTRAINT roles_name_unique UNIQUE (name)
);

CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE RESTRICT,
  office_id uuid REFERENCES public.offices (id) ON DELETE RESTRICT,
  CONSTRAINT user_roles_unique_per_scope UNIQUE NULLS NOT DISTINCT (user_id, role_id, office_id)
);

CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);
CREATE INDEX user_roles_role_id_idx ON public.user_roles (role_id);
CREATE INDEX user_roles_office_id_idx ON public.user_roles (office_id);

CREATE TRIGGER user_roles_set_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Accounts (office_id NULL = shared across offices)
-- ---------------------------------------------------------------------------
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  office_id uuid REFERENCES public.offices (id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  category public.account_category NOT NULL,
  currency text NOT NULL DEFAULT 'PKR',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT accounts_code_unique UNIQUE (code)
);

CREATE INDEX accounts_office_id_idx ON public.accounts (office_id);
CREATE INDEX accounts_category_idx ON public.accounts (category);

CREATE TRIGGER accounts_set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Account balances (per account per office; shared accounts still keyed by office)
-- ---------------------------------------------------------------------------
CREATE TABLE public.account_balances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  office_id uuid NOT NULL REFERENCES public.offices (id) ON DELETE RESTRICT,
  balance numeric(24, 6) NOT NULL DEFAULT 0,
  CONSTRAINT account_balances_account_office_unique UNIQUE (account_id, office_id)
);

CREATE INDEX account_balances_account_id_idx ON public.account_balances (account_id);
CREATE INDEX account_balances_office_id_idx ON public.account_balances (office_id);

CREATE TRIGGER account_balances_set_updated_at
  BEFORE UPDATE ON public.account_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Vendors & customers
-- ---------------------------------------------------------------------------
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  office_id uuid REFERENCES public.offices (id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  tax_id text,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT vendors_code_unique UNIQUE (code)
);

CREATE INDEX vendors_office_id_idx ON public.vendors (office_id);

CREATE TRIGGER vendors_set_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  office_id uuid REFERENCES public.offices (id) ON DELETE RESTRICT,
  code text NOT NULL,
  name text NOT NULL,
  tax_id text,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT customers_code_unique UNIQUE (code)
);

CREATE INDEX customers_office_id_idx ON public.customers (office_id);

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Assets
-- ---------------------------------------------------------------------------
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  office_id uuid NOT NULL REFERENCES public.offices (id) ON DELETE RESTRICT,
  account_id uuid REFERENCES public.accounts (id) ON DELETE RESTRICT,
  asset_code text NOT NULL,
  name text NOT NULL,
  purchase_date date,
  cost numeric(24, 6) NOT NULL DEFAULT 0,
  salvage_value numeric(24, 6) NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT assets_code_per_office UNIQUE (office_id, asset_code)
);

CREATE INDEX assets_office_id_idx ON public.assets (office_id);
CREATE INDEX assets_account_id_idx ON public.assets (account_id);

CREATE TRIGGER assets_set_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  office_id uuid NOT NULL REFERENCES public.offices (id) ON DELETE RESTRICT,
  counterparty_office_id uuid REFERENCES public.offices (id) ON DELETE RESTRICT,
  type public.transaction_type NOT NULL,
  status public.transaction_status NOT NULL DEFAULT 'PENDING',
  transaction_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  currency text NOT NULL DEFAULT 'PKR',
  reference text,
  description text,
  is_reversed boolean NOT NULL DEFAULT false,
  reversal_of_transaction_id uuid REFERENCES public.transactions (id) ON DELETE RESTRICT,
  vendor_id uuid REFERENCES public.vendors (id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES public.customers (id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT transactions_reversal_requires_original CHECK (
    (type <> 'REVERSAL') OR (reversal_of_transaction_id IS NOT NULL)
  ),
  CONSTRAINT transactions_no_self_reversal CHECK (
    reversal_of_transaction_id IS DISTINCT FROM id
  )
);

CREATE INDEX transactions_office_id_idx ON public.transactions (office_id);
CREATE INDEX transactions_status_idx ON public.transactions (status);
CREATE INDEX transactions_type_idx ON public.transactions (type);
CREATE INDEX transactions_transaction_date_idx ON public.transactions (transaction_date);
CREATE INDEX transactions_reversal_of_idx ON public.transactions (reversal_of_transaction_id);

CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Transaction items (double-entry lines)
-- ---------------------------------------------------------------------------
CREATE TABLE public.transaction_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  transaction_id uuid NOT NULL REFERENCES public.transactions (id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  line_number smallint NOT NULL,
  debit numeric(24, 6) NOT NULL DEFAULT 0,
  credit numeric(24, 6) NOT NULL DEFAULT 0,
  description text,
  asset_id uuid REFERENCES public.assets (id) ON DELETE RESTRICT,
  CONSTRAINT transaction_items_debit_credit_nonneg CHECK (debit >= 0 AND credit >= 0),
  CONSTRAINT transaction_items_one_sided CHECK (
    (debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0) OR (debit = 0 AND credit = 0)
  ),
  CONSTRAINT transaction_items_line_unique UNIQUE (transaction_id, line_number)
);

CREATE INDEX transaction_items_transaction_id_idx ON public.transaction_items (transaction_id);
CREATE INDEX transaction_items_account_id_idx ON public.transaction_items (account_id);

CREATE TRIGGER transaction_items_set_updated_at
  BEFORE UPDATE ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Approvals
-- ---------------------------------------------------------------------------
CREATE TABLE public.approvals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  transaction_id uuid NOT NULL REFERENCES public.transactions (id) ON DELETE RESTRICT,
  approver_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  status public.approval_status NOT NULL DEFAULT 'PENDING',
  decided_at timestamptz,
  comment text
);

CREATE INDEX approvals_transaction_id_idx ON public.approvals (transaction_id);
CREATE INDEX approvals_approver_user_id_idx ON public.approvals (approver_user_id);
CREATE INDEX approvals_status_idx ON public.approvals (status);

CREATE TRIGGER approvals_set_updated_at
  BEFORE UPDATE ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit logs (append-only; no UPDATE/DELETE via triggers)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation public.audit_operation NOT NULL,
  old_data jsonb,
  new_data jsonb,
  context jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX audit_logs_table_record_idx ON public.audit_logs (table_name, record_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at);

-- ---------------------------------------------------------------------------
-- Cash closings
-- ---------------------------------------------------------------------------
CREATE TABLE public.cash_closings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  office_id uuid NOT NULL REFERENCES public.offices (id) ON DELETE RESTRICT,
  closing_date date NOT NULL,
  opening_cash numeric(24, 6) NOT NULL DEFAULT 0,
  closing_cash numeric(24, 6) NOT NULL DEFAULT 0,
  variance numeric(24, 6) NOT NULL DEFAULT 0,
  status public.cash_closing_status NOT NULL DEFAULT 'DRAFT',
  notes text,
  CONSTRAINT cash_closings_unique_per_day UNIQUE (office_id, closing_date)
);

CREATE INDEX cash_closings_office_id_idx ON public.cash_closings (office_id);

CREATE TRIGGER cash_closings_set_updated_at
  BEFORE UPDATE ON public.cash_closings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Bank reconciliations
-- ---------------------------------------------------------------------------
CREATE TABLE public.bank_reconciliations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  office_id uuid NOT NULL REFERENCES public.offices (id) ON DELETE RESTRICT,
  bank_account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  statement_date date NOT NULL,
  book_balance numeric(24, 6) NOT NULL DEFAULT 0,
  statement_balance numeric(24, 6) NOT NULL DEFAULT 0,
  difference numeric(24, 6) NOT NULL DEFAULT 0,
  status public.bank_reconciliation_status NOT NULL DEFAULT 'PENDING',
  reconciled_at timestamptz,
  notes text
);

CREATE INDEX bank_reconciliations_office_id_idx ON public.bank_reconciliations (office_id);
CREATE INDEX bank_reconciliations_bank_account_id_idx ON public.bank_reconciliations (bank_account_id);

CREATE TRIGGER bank_reconciliations_set_updated_at
  BEFORE UPDATE ON public.bank_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Balance application: when transaction becomes POSTED
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_posted_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
  v_office_id uuid;
  v_sign int;
  v_actor uuid;
BEGIN
  SELECT office_id, created_by INTO v_office_id, v_actor
  FROM public.transactions
  WHERE id = p_transaction_id;

  IF v_office_id IS NULL THEN
    RAISE EXCEPTION 'Transaction % not found', p_transaction_id;
  END IF;

  SELECT CASE WHEN t.type = 'REVERSAL' THEN -1 ELSE 1 END INTO v_sign
  FROM public.transactions t
  WHERE t.id = p_transaction_id;

  FOR r IN
    SELECT ti.account_id, ti.debit, ti.credit
    FROM public.transaction_items ti
    WHERE ti.transaction_id = p_transaction_id
  LOOP
    INSERT INTO public.account_balances (id, account_id, office_id, balance, created_by)
    VALUES (uuid_generate_v4(), r.account_id, v_office_id, v_sign * (r.debit - r.credit), v_actor)
    ON CONFLICT (account_id, office_id)
    DO UPDATE SET
      balance = public.account_balances.balance + (EXCLUDED.balance),
      updated_at = timezone('utc', now());
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Transaction status transition & posting
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transactions_posting_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status = 'POSTED' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Posted transactions cannot change status; use a reversal entry';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_posting_guard
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.transactions_posting_guard();

CREATE OR REPLACE FUNCTION public.transactions_on_posted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  debit_sum numeric(24, 6);
  credit_sum numeric(24, 6);
BEGIN
  IF NEW.status = 'POSTED'
     AND (
       TG_OP = 'INSERT'
       OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'POSTED')
     ) THEN
    SELECT coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    INTO debit_sum, credit_sum
    FROM public.transaction_items
    WHERE transaction_id = NEW.id;

    IF debit_sum <> credit_sum THEN
      RAISE EXCEPTION 'Transaction % is not balanced: debit % credit %', NEW.id, debit_sum, credit_sum;
    END IF;

    PERFORM public.apply_posted_transaction(NEW.id);

    IF NEW.type = 'REVERSAL' AND NEW.reversal_of_transaction_id IS NOT NULL THEN
      UPDATE public.transactions
      SET is_reversed = true,
          updated_at = timezone('utc', now())
      WHERE id = NEW.reversal_of_transaction_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER transactions_on_posted
  AFTER INSERT OR UPDATE OF status ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.transactions_on_posted();

-- ---------------------------------------------------------------------------
-- Prevent row deletion (all tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_row_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'DELETE not allowed on table %; use reversal entries or void records', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER offices_prevent_delete BEFORE DELETE ON public.offices FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER users_prevent_delete BEFORE DELETE ON public.users FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER roles_prevent_delete BEFORE DELETE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER user_roles_prevent_delete BEFORE DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER accounts_prevent_delete BEFORE DELETE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER account_balances_prevent_delete BEFORE DELETE ON public.account_balances FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER vendors_prevent_delete BEFORE DELETE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER customers_prevent_delete BEFORE DELETE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER assets_prevent_delete BEFORE DELETE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER transactions_prevent_delete BEFORE DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER transaction_items_prevent_delete BEFORE DELETE ON public.transaction_items FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER approvals_prevent_delete BEFORE DELETE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER audit_logs_prevent_delete BEFORE DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER cash_closings_prevent_delete BEFORE DELETE ON public.cash_closings FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();
CREATE TRIGGER bank_reconciliations_prevent_delete BEFORE DELETE ON public.bank_reconciliations FOR EACH ROW EXECUTE FUNCTION public.prevent_row_delete();

-- ---------------------------------------------------------------------------
-- Audit: generic trigger (append-only audit_logs)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_actor := coalesce(auth.uid(), NEW.created_by);
  ELSE
    v_actor := coalesce(auth.uid(), NEW.created_by, OLD.created_by);
  END IF;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'audit_row_change: missing actor (auth.uid() or created_by)';
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (created_by, table_name, record_id, operation, old_data, new_data)
    VALUES (v_actor, TG_TABLE_NAME::text, NEW.id, 'INSERT', NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (created_by, table_name, record_id, operation, old_data, new_data)
    VALUES (v_actor, TG_TABLE_NAME::text, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Note: audit_logs table must NOT have BEFORE INSERT trigger that fires audit to avoid recursion.
-- Skip audit_logs self-auditing; add triggers for key tables only.

CREATE TRIGGER offices_audit AFTER INSERT OR UPDATE ON public.offices FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER users_audit AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER roles_audit AFTER INSERT OR UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER user_roles_audit AFTER INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER accounts_audit AFTER INSERT OR UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER account_balances_audit AFTER INSERT OR UPDATE ON public.account_balances FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER vendors_audit AFTER INSERT OR UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER customers_audit AFTER INSERT OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER assets_audit AFTER INSERT OR UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER transactions_audit AFTER INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER transaction_items_audit AFTER INSERT OR UPDATE ON public.transaction_items FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER approvals_audit AFTER INSERT OR UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER cash_closings_audit AFTER INSERT OR UPDATE ON public.cash_closings FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER bank_reconciliations_audit AFTER INSERT OR UPDATE ON public.bank_reconciliations FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- ---------------------------------------------------------------------------
-- Audit logs: immutable rows (no updates)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_audit_logs_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'UPDATE not allowed on audit_logs';
END;
$$;

CREATE TRIGGER audit_logs_prevent_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_logs_update();

CREATE OR REPLACE FUNCTION public.audit_logs_set_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NEW.created_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_logs_set_timestamps
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.audit_logs_set_timestamps();
