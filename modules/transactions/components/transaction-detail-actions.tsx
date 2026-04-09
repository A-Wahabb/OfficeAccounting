"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  approveTransactionAction,
  rejectTransactionAction,
} from "@/app/actions/transactions";
import type { TransactionSummary } from "@/types/transaction";

type TransactionDetailActionsProps = {
  transactionId: string;
  status: TransactionSummary["status"];
  type: TransactionSummary["type"];
  canApprove: boolean;
  canReject: boolean;
};

export function TransactionDetailActions({
  transactionId,
  status,
  type,
  canApprove,
  canReject,
}: TransactionDetailActionsProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approveMut = useMutation({
    mutationFn: () => approveTransactionAction(transactionId, comment),
    onSuccess: (r) => {
      if (r.ok) {
        setError(null);
        setComment("");
        router.refresh();
      } else {
        setError(r.error);
      }
    },
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectTransactionAction(transactionId, comment),
    onSuccess: (r) => {
      if (r.ok) {
        setError(null);
        setComment("");
        router.refresh();
      } else {
        setError(r.error);
      }
    },
  });

  const showApprove = canApprove && status === "PENDING" && type !== "REVERSAL";
  const showReject = canReject && status === "PENDING";
  if (!showApprove && !showReject) {
    return null;
  }

  return (
    <div className="rounded-md border border-neutral-200 p-4 dark:border-neutral-700">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Actions
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Approval note (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-72 rounded border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-900"
        />
        <button
          type="button"
          disabled={approveMut.isPending}
          onClick={() => approveMut.mutate()}
          className="rounded bg-blue-700 px-3 py-1.5 text-sm text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {approveMut.isPending ? "Approving..." : "Approve transaction"}
        </button>
        {showReject && (
          <button
            type="button"
            disabled={rejectMut.isPending}
            onClick={() => rejectMut.mutate()}
            className="rounded border border-rose-400 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            {rejectMut.isPending ? "Rejecting..." : "Reject transaction"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
