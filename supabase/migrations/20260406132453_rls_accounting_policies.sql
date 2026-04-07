-- File created with: supabase migration new rls_accounting_policies
--
-- Row Level Security for multi-office accounting.
-- Prerequisites: public.roles contains ADMIN, MANAGER, ACCOUNTANT (seed via app or SQL).
-- Office filter: set JWT app_metadata.active_office_id (optional); when set, rows must match.
-- auth.uid() is used via Supabase Auth session.

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER avoids RLS recursion on user_roles / roles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.jwt_active_office_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(trim(COALESCE(
      auth.jwt()->'app_metadata'->>'active_office_id',
      ''
    )), '')::uuid,
    NULLIF(trim(COALESCE(
      auth.jwt()->'user_metadata'->>'active_office_id',
      ''
    )), '')::uuid
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_role(_role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = _role_name
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_role('ADMIN');
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_role('ADMIN') OR public.user_has_role('MANAGER');
$$;

CREATE OR REPLACE FUNCTION public.is_accountant()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_role('ADMIN') OR public.user_has_role('ACCOUNTANT');
$$;

CREATE OR REPLACE FUNCTION public.has_accounting_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_role('ADMIN')
      OR public.user_has_role('MANAGER')
      OR public.user_has_role('ACCOUNTANT');
$$;

CREATE OR REPLACE FUNCTION public.user_has_global_accounting_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (SELECT auth.uid())
      AND ur.office_id IS NULL
      AND r.name IN ('ADMIN', 'MANAGER', 'ACCOUNTANT')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_allowed_office_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id
  FROM public.offices o
  WHERE public.is_admin()
     OR public.user_has_global_accounting_access()
  UNION
  SELECT ur.office_id
  FROM public.user_roles ur
  WHERE ur.user_id = (SELECT auth.uid())
    AND ur.office_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.office_row_visible(o_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND o_id IS NOT NULL
    AND (
      public.is_admin()
      OR (
        o_id IN (SELECT public.user_allowed_office_ids())
        AND (
          public.jwt_active_office_id() IS NULL
          OR o_id = public.jwt_active_office_id()
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.jwt_active_office_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_accountant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_accounting_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_global_accounting_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_allowed_office_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.office_row_visible(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Audit trigger: run as definer so audit_logs RLS does not block inserts
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.audit_row_change() SECURITY DEFINER;
ALTER FUNCTION public.audit_row_change() SET search_path = public;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- roles: read for accounting users; write admin only
-- ---------------------------------------------------------------------------
CREATE POLICY roles_select ON public.roles
FOR SELECT TO authenticated
USING (public.has_accounting_role());

CREATE POLICY roles_write_insert ON public.roles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY roles_write_update ON public.roles
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- user_roles: users see own assignments; admins see all
-- ---------------------------------------------------------------------------
CREATE POLICY user_roles_select ON public.user_roles
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR user_id = (SELECT auth.uid())
);

CREATE POLICY user_roles_write ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY user_roles_update ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- users profile
-- ---------------------------------------------------------------------------
CREATE POLICY users_select ON public.users
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR id = (SELECT auth.uid())
);

CREATE POLICY users_insert ON public.users
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY users_update ON public.users
FOR UPDATE TO authenticated
USING (public.is_admin() OR id = (SELECT auth.uid()))
WITH CHECK (public.is_admin() OR id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- account_balances (balance updates from posting run as the session user)
-- ---------------------------------------------------------------------------
CREATE POLICY account_balances_select ON public.account_balances
FOR SELECT TO authenticated
USING (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);

CREATE POLICY account_balances_insert ON public.account_balances
FOR INSERT TO authenticated
WITH CHECK (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);

CREATE POLICY account_balances_update ON public.account_balances
FOR UPDATE TO authenticated
USING (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
)
WITH CHECK (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);

-- ---------------------------------------------------------------------------
-- approvals (managers approve; accountants may create approval rows)
-- ---------------------------------------------------------------------------
CREATE POLICY approvals_select ON public.approvals
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = approvals.transaction_id
      AND public.has_accounting_role()
      AND public.office_row_visible(t.office_id)
  )
);

CREATE POLICY approvals_insert ON public.approvals
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = approvals.transaction_id
      AND public.office_row_visible(t.office_id)
      AND (
        public.is_admin()
        OR public.is_manager()
        OR public.is_accountant()
      )
  )
);

CREATE POLICY approvals_update ON public.approvals
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = approvals.transaction_id
      AND public.office_row_visible(t.office_id)
      AND (
        public.is_admin()
        OR public.is_manager()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = approvals.transaction_id
      AND public.office_row_visible(t.office_id)
      AND (
        public.is_admin()
        OR public.is_manager()
      )
  )
);

-- ---------------------------------------------------------------------------
-- offices
-- ---------------------------------------------------------------------------
CREATE POLICY offices_select ON public.offices
FOR SELECT TO authenticated
USING (
  public.has_accounting_role()
  AND (
    public.is_admin()
    OR (
      id IN (SELECT public.user_allowed_office_ids())
      AND (
        public.jwt_active_office_id() IS NULL
        OR id = public.jwt_active_office_id()
      )
    )
  )
);

CREATE POLICY offices_insert ON public.offices
FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY offices_update ON public.offices
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- accounts (office_id NULL = shared chart lines)
-- ---------------------------------------------------------------------------
CREATE POLICY accounts_select ON public.accounts
FOR SELECT TO authenticated
USING (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
);

CREATE POLICY accounts_insert ON public.accounts
FOR INSERT TO authenticated
WITH CHECK (
  public.has_accounting_role()
  AND (
    public.is_admin()
    OR public.is_manager()
    OR (
      public.is_accountant()
      AND office_id IS NOT NULL
      AND public.office_row_visible(office_id)
    )
  )
);

CREATE POLICY accounts_update ON public.accounts
FOR UPDATE TO authenticated
USING (
  public.has_accounting_role()
  AND (
    public.is_admin()
    OR public.is_manager()
    OR (
      public.is_accountant()
      AND office_id IS NOT NULL
      AND public.office_row_visible(office_id)
    )
  )
)
WITH CHECK (
  public.has_accounting_role()
  AND (
    public.is_admin()
    OR public.is_manager()
    OR (
      public.is_accountant()
      AND office_id IS NOT NULL
      AND public.office_row_visible(office_id)
    )
  )
);

-- ---------------------------------------------------------------------------
-- transactions (no delete — no DELETE policy)
-- ---------------------------------------------------------------------------
CREATE POLICY transactions_select ON public.transactions
FOR SELECT TO authenticated
USING (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);

CREATE POLICY transactions_insert ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (
  public.office_row_visible(office_id)
  AND (
    public.is_admin()
    OR public.is_accountant()
  )
);

CREATE POLICY transactions_update ON public.transactions
FOR UPDATE TO authenticated
USING (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
  AND (
    public.is_admin()
    OR public.is_manager()
    OR (
      public.is_accountant()
      AND status IN ('PENDING', 'REJECTED')
    )
  )
)
WITH CHECK (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
  AND (
    public.is_admin()
    OR public.is_manager()
    OR (
      public.is_accountant()
      AND status IN ('PENDING', 'REJECTED')
    )
  )
);

-- ---------------------------------------------------------------------------
-- transaction_items
-- ---------------------------------------------------------------------------
CREATE POLICY transaction_items_select ON public.transaction_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = transaction_items.transaction_id
      AND public.has_accounting_role()
      AND public.office_row_visible(t.office_id)
  )
);

CREATE POLICY transaction_items_insert ON public.transaction_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = transaction_items.transaction_id
      AND public.office_row_visible(t.office_id)
      AND (
        public.is_admin()
        OR public.is_accountant()
      )
      AND t.status IN ('PENDING', 'REJECTED')
  )
);

CREATE POLICY transaction_items_update ON public.transaction_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = transaction_items.transaction_id
      AND public.office_row_visible(t.office_id)
      AND (
        public.is_admin()
        OR public.is_manager()
        OR (
          public.is_accountant()
          AND t.status IN ('PENDING', 'REJECTED')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = transaction_items.transaction_id
      AND public.office_row_visible(t.office_id)
      AND (
        public.is_admin()
        OR public.is_manager()
        OR (
          public.is_accountant()
          AND t.status IN ('PENDING', 'REJECTED')
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- vendors
-- ---------------------------------------------------------------------------
CREATE POLICY vendors_select ON public.vendors
FOR SELECT TO authenticated
USING (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
);

CREATE POLICY vendors_insert ON public.vendors
FOR INSERT TO authenticated
WITH CHECK (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
);

CREATE POLICY vendors_update ON public.vendors
FOR UPDATE TO authenticated
USING (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
)
WITH CHECK (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
CREATE POLICY customers_select ON public.customers
FOR SELECT TO authenticated
USING (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
);

CREATE POLICY customers_insert ON public.customers
FOR INSERT TO authenticated
WITH CHECK (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
);

CREATE POLICY customers_update ON public.customers
FOR UPDATE TO authenticated
USING (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
)
WITH CHECK (
  public.has_accounting_role()
  AND (
    office_id IS NULL
    OR public.office_row_visible(office_id)
  )
);

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------
CREATE POLICY assets_select ON public.assets
FOR SELECT TO authenticated
USING (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);

CREATE POLICY assets_insert ON public.assets
FOR INSERT TO authenticated
WITH CHECK (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);

CREATE POLICY assets_update ON public.assets
FOR UPDATE TO authenticated
USING (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
)
WITH CHECK (
  public.has_accounting_role()
  AND public.office_row_visible(office_id)
);

-- ---------------------------------------------------------------------------
-- audit_logs: INSERT (UPDATE) only — no delete policy; SELECT for oversight
-- ---------------------------------------------------------------------------
CREATE POLICY audit_logs_select ON public.audit_logs
FOR SELECT TO authenticated
USING (public.is_admin() OR public.is_manager());

CREATE POLICY audit_logs_insert ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND operation IN ('INSERT', 'UPDATE')
);

-- ---------------------------------------------------------------------------
-- Optional: force RLS for table owner (Supabase typically uses postgres owner)
-- ---------------------------------------------------------------------------
-- ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
