import type { AppRole } from "@/lib/auth/types";
import { hasAnyRole } from "@/lib/auth/fetch-roles";

/**
 * Longest prefix first so /dashboard/admin matches before /dashboard.
 */
export const PROTECTED_AUTH_PREFIXES = ["/dashboard"] as const;

export type RoleRouteRule = {
  prefix: string;
  allowedRoles: readonly AppRole[];
};

export const ROLE_ROUTE_RULES: RoleRouteRule[] = [
  { prefix: "/dashboard/admin", allowedRoles: ["ADMIN"] },
  { prefix: "/dashboard/manager", allowedRoles: ["ADMIN", "MANAGER"] },
  {
    prefix: "/dashboard",
    allowedRoles: ["ADMIN", "MANAGER", "ACCOUNTANT"],
  },
];

export function getRoleRuleForPath(pathname: string): RoleRouteRule | null {
  const sorted = [...ROLE_ROUTE_RULES].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );
  for (const rule of sorted) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule;
    }
  }
  return null;
}

export function canAccessPath(
  pathname: string,
  roles: AppRole[],
): { ok: boolean; rule: RoleRouteRule | null } {
  const rule = getRoleRuleForPath(pathname);
  if (!rule) {
    return { ok: true, rule: null };
  }
  return {
    ok: hasAnyRole(roles, rule.allowedRoles),
    rule,
  };
}
