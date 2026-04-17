-- Extend asset_kind with CASH and BANK (ledger-linked cash/bank register entries).
--
-- Requires migration 20260407055256_asset_management_module.sql to have run first in normal
-- setups (it creates public.asset_kind with EQUIPMENT, COMPUTER, PROPERTY). If that type is
-- missing entirely, we create it here with all five labels so this file can be applied safely.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'asset_kind'
      AND t.typtype = 'e'
  ) THEN
    CREATE TYPE public.asset_kind AS ENUM (
      'EQUIPMENT',
      'COMPUTER',
      'PROPERTY',
      'CASH',
      'BANK'
    );
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'asset_kind'
      AND e.enumlabel = 'CASH'
  ) THEN
    ALTER TYPE public.asset_kind ADD VALUE 'CASH';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'asset_kind'
      AND e.enumlabel = 'BANK'
  ) THEN
    ALTER TYPE public.asset_kind ADD VALUE 'BANK';
  END IF;
END
$$;
