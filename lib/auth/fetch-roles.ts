import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/lib/auth/types";
import { isAppRole } from "@/lib/auth/types";

/**
 * Loads role names from public.user_roles → public.roles for a user (matches auth.users id).
 */
export async function fetchUserRoles(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  const names: string[] = [];
  for (const row of data as unknown[]) {
    const roles = (row as { roles?: { name?: string } | { name?: string }[] })
      .roles;
    if (Array.isArray(roles)) {
      for (const r of roles) {
        if (r?.name) names.push(r.name);
      }
    } else if (roles && typeof roles === "object" && "name" in roles) {
      const n = (roles as { name: string }).name;
      if (n) names.push(n);
    }
  }

  return Array.from(new Set(names.filter(isAppRole)));
}

export function hasAnyRole(
  userRoles: AppRole[],
  allowed: readonly AppRole[],
): boolean {
  return allowed.some((r) => userRoles.includes(r));
}
