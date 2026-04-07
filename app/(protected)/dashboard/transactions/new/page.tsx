import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { ROUTES } from "@/lib/constants/routes";
import { TransactionForm } from "@/modules/transactions";
import { listOffices } from "@/services/office";

export default async function NewTransactionPage() {
  await requireRole(["ADMIN", "ACCOUNTANT"]);

  const offices = await listOffices();
  const activeOffices = offices.filter((o) => o.status === "active");

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
          New transaction
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Creates a <strong>PENDING</strong> transaction with lines in one database transaction (
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">fn_transaction_create</code>
          ).
        </p>
      </div>

      {activeOffices.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          No active offices. Create or activate an office before entering transactions.
        </p>
      ) : (
        <TransactionForm offices={activeOffices} />
      )}
    </div>
  );
}
