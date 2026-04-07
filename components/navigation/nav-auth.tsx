"use client";

import Link from "next/link";

import { ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/hooks/use-auth";

export function NavAuth() {
  const { user, roles, loading, signOut } = useAuth();

  if (loading) {
    return (
      <span className="text-xs text-neutral-500 dark:text-neutral-500">
        …
      </span>
    );
  }

  if (!user) {
    return (
      <Link
        href={ROUTES.login}
        className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[140px] truncate text-xs text-neutral-500 sm:inline dark:text-neutral-400">
        {user.email}
        {roles.length > 0 ? ` · ${roles.join(", ")}` : ""}
      </span>
      <Link
        href={ROUTES.dashboard}
        className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        Dashboard
      </Link>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        Log out
      </button>
    </div>
  );
}
