import Link from "next/link";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";
import { canApprove, canReject } from "@/lib/auth/transaction-permissions";
import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { TransactionDetailActions } from "@/modules/transactions/components/transaction-detail-actions";
import { getTransactionWithItems } from "@/services/transaction";

export default async function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  await requireRole(["ADMIN", "MANAGER", "ACCOUNTANT"]);
  const { roles } = await getServerSession();

  const tx = await getTransactionWithItems(params.id);
  if (!tx) {
    notFound();
  }

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
          Transaction details
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {tx.transaction_number} • {tx.type} • {tx.status}
        </p>
      </div>

      <div className="grid gap-4 rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-700 sm:grid-cols-2">
        <div>
          <span className="font-medium">Office:</span> {tx.office_code} — {tx.office_name}
        </div>
        <div>
          <span className="font-medium">Date:</span> {tx.transaction_date}
        </div>
        <div>
          <span className="font-medium">Currency:</span> {tx.currency}
        </div>
        <div>
          <span className="font-medium">Created at:</span> {new Date(tx.created_at).toLocaleString()}
        </div>
        <div className="sm:col-span-2">
          <span className="font-medium">Description:</span> {tx.description ?? "—"}
        </div>
      </div>

      <TransactionDetailActions
        transactionId={tx.id}
        status={tx.status}
        type={tx.type}
        canApprove={canApprove(roles)}
        canReject={canReject(roles)}
      />

      <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Account</th>
              <th className="px-3 py-2 font-medium text-right">Debit</th>
              <th className="px-3 py-2 font-medium text-right">Credit</th>
              <th className="px-3 py-2 font-medium">Memo</th>
            </tr>
          </thead>
          <tbody>
            {tx.items.map((line) => (
              <tr key={line.id} className="border-t border-neutral-200 dark:border-neutral-700">
                <td className="px-3 py-2">{line.line_number}</td>
                <td className="px-3 py-2">
                  {line.account_code} — {line.account_name}
                </td>
                <td className="px-3 py-2 text-right">{line.debit.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{line.credit.toFixed(2)}</td>
                <td className="px-3 py-2">{line.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
