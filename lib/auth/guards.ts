import { redirect } from "next/navigation";

import { hasAnyRole } from "@/lib/auth/fetch-roles";
import type { AppRole } from "@/lib/auth/types";
import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";

const ACCOUNTING_ROLES: AppRole[] = ["ADMIN", "MANAGER", "ACCOUNTANT"];

/**
 * Redirects to login if there is no Supabase session.
 */
export async function requireAuth() {
  const { user, roles } = await getServerSession();
  if (!user) {
    redirect(`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.dashboard)}`);
  }
  return { user, roles };
}

/**
 * Requires at least one accounting role from user_roles (ADMIN, MANAGER, or ACCOUNTANT).
 */
export async function requireAccountingRole() {
  const { user, roles } = await requireAuth();
  if (roles.length === 0) {
    redirect(`${ROUTES.login}?error=no_roles`);
  }
  if (!hasAnyRole(roles, ACCOUNTING_ROLES)) {
    redirect(`${ROUTES.dashboard}?error=forbidden`);
  }
  return { user, roles };
}

/**
 * Requires at least one of the given roles (e.g. ADMIN-only page).
 */
export async function requireRole(allowed: readonly AppRole[]) {
  const { user, roles } = await requireAuth();
  if (roles.length === 0) {
    redirect(`${ROUTES.login}?error=no_roles`);
  }
  if (!hasAnyRole(roles, allowed)) {
    redirect(`${ROUTES.dashboard}?error=forbidden`);
  }
  return { user, roles };
}
