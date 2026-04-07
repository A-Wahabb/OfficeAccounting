import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { ROUTES } from "@/lib/constants/routes";
import { AccountManagement } from "@/modules/accounts";
import { listAccountsWithBalances } from "@/services/account";
import { listOffices } from "@/services/office";

export default async function ChartOfAccountsPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  const [accounts, offices] = await Promise.all([
    listAccountsWithBalances(),
    listOffices(),
  ]);

  const activeOffices = offices.filter((o) => o.status === "active");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={ROUTES.dashboard}
          className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Chart of accounts
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Define account codes and types. Shared accounts have no office;{" "}
          office-specific accounts apply to one site. Balances update when
          transactions are posted (see database trigger{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
            apply_posted_transaction
          </code>
          ).
        </p>
      </div>
      <AccountManagement
        initialAccounts={accounts}
        offices={activeOffices}
      />
    </div>
  );
}
