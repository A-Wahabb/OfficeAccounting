import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { ROUTES } from "@/lib/constants/routes";
import { ApprovalQueue } from "@/modules/transactions";
import { listTransactions } from "@/services/transaction";

export default async function TransactionApprovalsPage() {
  await requireRole(["ADMIN", "MANAGER"]);

  const pending = await listTransactions({ status: "PENDING" });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={ROUTES.dashboardTransactions}
          className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Transactions
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Approval queue
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Manager approval moves items to <strong>APPROVED</strong> (
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">fn_transaction_approve</code>
          ).
        </p>
      </div>

      <ApprovalQueue transactions={pending} />
    </div>
  );
}
