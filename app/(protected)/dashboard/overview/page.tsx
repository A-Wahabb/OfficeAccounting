import Link from "next/link";

import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";

type DashboardPageProps = {
  searchParams?: { error?: string };
};

export default async function DashboardOverviewPage({
  searchParams,
}: DashboardPageProps) {
  const { user, roles } = await getServerSession();
  const forbidden = searchParams?.error === "forbidden";

  return (
    <div className="space-y-6">
      {forbidden && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
          You do not have permission to view that area.
        </p>
      )}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Dashboard
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Signed in as{" "}
          <span className="font-mono text-neutral-900 dark:text-neutral-100">
            {user?.email ?? user?.id ?? "unknown"}
          </span>
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Roles from{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
            user_roles
          </code>
          :{" "}
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {roles.length > 0 ? roles.join(", ") : "none"}
          </span>
        </p>
      </div>
      <ul className="list-inside list-disc space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
        {(roles.includes("ADMIN") || roles.includes("MANAGER")) && (
          <li>
            <Link
              href={ROUTES.dashboardManager}
              className="underline-offset-4 hover:underline"
            >
              Manager area (ADMIN, MANAGER)
            </Link>
          </li>
        )}
        {(roles.includes("ADMIN") ||
          roles.includes("MANAGER") ||
          roles.includes("ACCOUNTANT")) && (
          <li>
            <Link
              href={ROUTES.dashboardTransactions}
              className="underline-offset-4 hover:underline"
            >
              Transactions (engine: PENDING → APPROVED or REJECTED)
            </Link>
          </li>
        )}
        {(roles.includes("ADMIN") ||
          roles.includes("MANAGER") ||
          roles.includes("ACCOUNTANT")) && (
          <li>
            <Link
              href={ROUTES.dashboardAssets}
              className="underline-offset-4 hover:underline"
            >
              Assets (purchase, lifecycle, manual depreciation)
            </Link>
          </li>
        )}
        {(roles.includes("ADMIN") ||
          roles.includes("MANAGER") ||
          roles.includes("ACCOUNTANT")) && (
          <li>
            <Link
              href={ROUTES.dashboardCashClosings}
              className="underline-offset-4 hover:underline"
            >
              Daily cash closing
            </Link>
          </li>
        )}
        {(roles.includes("ADMIN") ||
          roles.includes("MANAGER") ||
          roles.includes("ACCOUNTANT")) && (
          <li>
            <Link
              href={ROUTES.dashboardReports}
              className="underline-offset-4 hover:underline"
            >
              Reports (trial balance, P&L, cash flow, reconciliation)
            </Link>
          </li>
        )}
        {(roles.includes("ADMIN") || roles.includes("MANAGER")) && (
          <li>
            <Link
              href={ROUTES.dashboardAccounts}
              className="underline-offset-4 hover:underline"
            >
              Chart of accounts (ADMIN, MANAGER)
            </Link>
          </li>
        )}
        {roles.includes("ADMIN") && (
          <>
            <li>
              <Link
                href={ROUTES.dashboardOffices}
                className="underline-offset-4 hover:underline"
              >
                Office management (ADMIN)
              </Link>
            </li>
            <li>
              <Link
                href={ROUTES.dashboardAdmin}
                className="underline-offset-4 hover:underline"
              >
                Admin area (ADMIN only)
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
