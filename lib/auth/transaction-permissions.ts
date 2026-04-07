import { hasAnyRole } from "@/lib/auth/fetch-roles";
import type { AppRole } from "@/lib/auth/types";

export function canApprove(roles: AppRole[]): boolean {
  return hasAnyRole(roles, ["ADMIN", "MANAGER"]);
}

export function canCreateTransaction(roles: AppRole[]): boolean {
  return hasAnyRole(roles, ["ADMIN", "ACCOUNTANT"]);
}

export function canPost(roles: AppRole[]): boolean {
  return hasAnyRole(roles, ["ADMIN", "MANAGER", "ACCOUNTANT"]);
}

export function canReverse(roles: AppRole[]): boolean {
  return hasAnyRole(roles, ["ADMIN", "ACCOUNTANT"]);
}
