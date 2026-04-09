"use client";

import type { TransactionSummary } from "@/types/transaction";

import { TransactionList } from "./transaction-list";

type ApprovalQueueProps = {
  transactions: readonly TransactionSummary[];
};

/**
 * Pending transactions awaiting manager approval (same table as the main list, approval actions only).
 */
export function ApprovalQueue({ transactions }: ApprovalQueueProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Manager/Admin can approve or reject pending transactions.
      </p>
      <TransactionList
        transactions={transactions}
        capabilities={{
          canApprove: true,
          canReject: true,
        }}
        emptyMessage="No transactions waiting for approval."
      />
    </div>
  );
}
