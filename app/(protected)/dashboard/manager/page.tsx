import { requireRole } from "@/lib/auth/guards";

export default async function DashboardManagerPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Manager
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        This route requires ADMIN or MANAGER (see{" "}
        <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
          user_roles
        </code>
        ). Use this area for approvals and transaction workflow.
      </p>
    </div>
  );
}
