import type { User } from "@supabase/supabase-js";

import { fetchUserRoles } from "@/lib/auth/fetch-roles";
import type { AppRole } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ServerSession = {
  user: User;
  roles: AppRole[];
};

export type ServerSessionOrNull = {
  user: User | null;
  roles: AppRole[];
};

/**
 * Server Components / Server Actions: current user and accounting roles from user_roles.
 */
export async function getServerSession(): Promise<ServerSessionOrNull> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, roles: [] };
  }

  const roles = await fetchUserRoles(supabase, user.id);
  return { user, roles };
}

export async function getServerSessionStrict(): Promise<ServerSession | null> {
  const session = await getServerSession();
  if (!session.user) {
    return null;
  }
  return { user: session.user, roles: session.roles };
}
