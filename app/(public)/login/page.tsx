import Link from "next/link";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { ROUTES } from "@/lib/constants/routes";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
          Sign in
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Use your Supabase Auth email and password. Roles come from the{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
            user_roles
          </code>{" "}
          table.
        </p>
      </div>
      <Suspense
        fallback={
          <p className="text-sm text-neutral-500">Loading sign-in form…</p>
        }
      >
        <LoginForm />
      </Suspense>
      <p className="text-sm text-neutral-500">
        <Link
          href={ROUTES.home}
          className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
        >
          Back to home
        </Link>
      </p>
    </div>
  );
}
