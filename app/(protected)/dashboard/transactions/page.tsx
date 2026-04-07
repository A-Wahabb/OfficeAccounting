import Link from "next/link";

import {
  canApprove,
  canCreateTransaction,
  canPost,
  canReverse,
} from "@/lib/auth/transaction-permissions";
import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { TransactionList } from "@/modules/transactions";
import { TransactionCreatedToast } from "@/modules/transactions/components/transaction-created-toast";
import { listTransactions } from "@/services/transaction";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: { created?: string };
}) {
  const { roles } = await getServerSession();
  const transactions = await listTransactions();
  const showCreatedToast = searchParams?.created === "1";

  return (
    <div className="space-y-6">
      <TransactionCreatedToast show={showCreatedToast} />
      <div className="space-y-1">
        <Link
          href={ROUTES.dashboard}
          className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Dashboard
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Transactions
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Numbers are assigned automatically (
              <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">TRX-YYYY-#####</code>
              ). Workflow: PENDING → manager approves → APPROVED → post → POSTED. Deleting rows is not
              allowed; use <strong>Reverse</strong> on posted entries.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {canCreateTransaction(roles) && (
              <Link
                href={ROUTES.dashboardTransactionsNew}
                className="rounded-md bg-neutral-900 px-3 py-2 font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
              >
                New transaction
              </Link>
            )}
            {(roles.includes("ADMIN") || roles.includes("MANAGER")) && (
              <Link
                href={ROUTES.dashboardTransactionsApprovals}
                className="rounded-md border border-neutral-300 px-3 py-2 font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Approval queue
              </Link>
            )}
          </div>
        </div>
      </div>

      <TransactionList
        transactions={transactions}
        capabilities={{
          canApprove: canApprove(roles),
          canPost: canPost(roles),
          canReverse: canReverse(roles),
        }}
      />
    </div>
  );
}
