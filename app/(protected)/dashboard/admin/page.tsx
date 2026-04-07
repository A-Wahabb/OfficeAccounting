import { requireRole } from "@/lib/auth/guards";

export default async function DashboardAdminPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Admin
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        This route is protected by a Server Component guard: only users with the
        ADMIN role in <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">user_roles</code> can view it.
      </p>
    </div>
  );
}
