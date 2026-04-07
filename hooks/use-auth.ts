"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchUserRoles, hasAnyRole } from "@/lib/auth/fetch-roles";
import type { AppRole } from "@/lib/auth/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/constants/routes";

export type UseAuthState = {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (allowed: readonly AppRole[]) => boolean;
};

export function useAuth(): UseAuthState {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = useCallback(
    async (userId: string) => {
      const r = await fetchUserRoles(supabase, userId);
      setRoles(r);
    },
    [supabase],
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadRoles(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadRoles(session.user.id);
      } else {
        setRoles([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadRoles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRoles([]);
    router.refresh();
    router.push(ROUTES.login);
  }, [router, supabase]);

  const hasRole = useCallback(
    (role: AppRole) => roles.includes(role),
    [roles],
  );

  const hasAnyRoleCb = useCallback(
    (allowed: readonly AppRole[]) => hasAnyRole(roles, allowed),
    [roles],
  );

  return {
    user,
    roles,
    loading,
    signOut,
    hasRole,
    hasAnyRole: hasAnyRoleCb,
  };
}
