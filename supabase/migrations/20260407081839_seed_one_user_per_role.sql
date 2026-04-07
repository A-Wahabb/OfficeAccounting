-- File intended to be generated with:
-- supabase migration new seed_one_user_per_role
--
-- Creates three email/password users and assigns
-- ADMIN / MANAGER / ACCOUNTANT (one user per role).
--
-- Password for all three:
--   12345678
--
-- Login emails:
--   admin@office.com
--   manager@office.com
--   accountant@office.com

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_instance_id uuid;
  v_encrypted_pw text := crypt('12345678', gen_salt('bf'));

  admin_email text := 'admin@office.com';
  manager_email text := 'manager@office.com';
  accountant_email text := 'accountant@office.com';

  admin_user_id uuid;
  manager_user_id uuid;
  accountant_user_id uuid;

  admin_role_id uuid;
  manager_role_id uuid;
  accountant_role_id uuid;
BEGIN
  -- Hosted Supabase uses auth.instances; local single-tenant often uses nil UUID.
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'auth'
      AND tablename = 'instances'
  ) THEN
    SELECT id INTO v_instance_id FROM auth.instances LIMIT 1;
  END IF;

  v_instance_id := COALESCE(
    v_instance_id,
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  -- -------------------------------------------------------------------------
  -- Seed auth users (auth.users + auth.identities) if missing
  -- -------------------------------------------------------------------------
  -- Admin
  SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
  IF admin_user_id IS NULL THEN
    admin_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      admin_user_id,
      v_instance_id,
      'authenticated',
      'authenticated',
      admin_email,
      v_encrypted_pw,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Seed Admin'),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      admin_user_id,
      jsonb_build_object(
        'sub', admin_user_id::text,
        'email', admin_email
      ),
      'email',
      admin_user_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );
  END IF;

  -- Manager
  SELECT id INTO manager_user_id FROM auth.users WHERE email = manager_email;
  IF manager_user_id IS NULL THEN
    manager_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      manager_user_id,
      v_instance_id,
      'authenticated',
      'authenticated',
      manager_email,
      v_encrypted_pw,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Seed Manager'),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      manager_user_id,
      jsonb_build_object(
        'sub', manager_user_id::text,
        'email', manager_email
      ),
      'email',
      manager_user_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );
  END IF;

  -- Accountant
  SELECT id INTO accountant_user_id FROM auth.users WHERE email = accountant_email;
  IF accountant_user_id IS NULL THEN
    accountant_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      accountant_user_id,
      v_instance_id,
      'authenticated',
      'authenticated',
      accountant_email,
      v_encrypted_pw,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Seed Accountant'),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      accountant_user_id,
      jsonb_build_object(
        'sub', accountant_user_id::text,
        'email', accountant_email
      ),
      'email',
      accountant_user_id::text,
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );
  END IF;

  -- Resolve ids by email (covers pre-existing users).
  SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;
  SELECT id INTO manager_user_id FROM auth.users WHERE email = manager_email;
  SELECT id INTO accountant_user_id FROM auth.users WHERE email = accountant_email;

  IF admin_user_id IS NULL OR manager_user_id IS NULL OR accountant_user_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve seed auth users';
  END IF;

  -- -------------------------------------------------------------------------
  -- Roles (created_by must reference an auth user)
  -- -------------------------------------------------------------------------
  INSERT INTO public.roles (created_by, name, description)
  VALUES (admin_user_id, 'ADMIN', 'System administrator')
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.roles (created_by, name, description)
  VALUES (admin_user_id, 'MANAGER', 'Office manager')
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO public.roles (created_by, name, description)
  VALUES (admin_user_id, 'ACCOUNTANT', 'Accounting staff')
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'ADMIN';
  SELECT id INTO manager_role_id FROM public.roles WHERE name = 'MANAGER';
  SELECT id INTO accountant_role_id FROM public.roles WHERE name = 'ACCOUNTANT';

  -- -------------------------------------------------------------------------
  -- Application profiles + role assignments
  -- -------------------------------------------------------------------------
  INSERT INTO public.users (id, created_by, display_name, email, is_active)
  SELECT u.id, admin_user_id, COALESCE(NULLIF(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)), u.email, true
  FROM auth.users u
  WHERE u.id IN (admin_user_id, manager_user_id, accountant_user_id)
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    is_active = true;

  INSERT INTO public.user_roles (created_by, user_id, role_id, office_id)
  VALUES
    (admin_user_id, admin_user_id, admin_role_id, NULL),
    (admin_user_id, manager_user_id, manager_role_id, NULL),
    (admin_user_id, accountant_user_id, accountant_role_id, NULL)
  ON CONFLICT (user_id, role_id, office_id) DO NOTHING;
END
$$;
