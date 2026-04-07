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
        Approve to move transactions to <strong>APPROVED</strong>. Posting is done separately after
        approval.
      </p>
      <TransactionList
        transactions={transactions}
        capabilities={{
          canApprove: true,
          canPost: false,
          canReverse: false,
        }}
        emptyMessage="No transactions waiting for approval."
      />
    </div>
  );
}
