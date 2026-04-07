"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  approveTransactionAction,
  postTransactionAction,
  reverseTransactionAction,
} from "@/app/actions/transactions";
import { ROUTES } from "@/lib/constants/routes";
import type { TransactionSummary } from "@/types/transaction";

type TransactionListProps = {
  transactions: readonly TransactionSummary[];
  capabilities: {
    canApprove: boolean;
    canPost: boolean;
    canReverse: boolean;
  };
  emptyMessage?: string;
};

export function TransactionList({
  transactions,
  capabilities,
  emptyMessage = "No transactions yet.",
}: TransactionListProps) {
  const router = useRouter();

  const refresh = () => {
    router.refresh();
  };

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{emptyMessage}</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-900/50">
          <tr>
            <th className="px-3 py-2 font-medium">Number</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">Office</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr
              key={t.id}
              className="border-t border-neutral-200 dark:border-neutral-700"
            >
              <td className="px-3 py-2 font-mono text-xs">{t.transaction_number}</td>
              <td className="px-3 py-2 whitespace-nowrap">{t.transaction_date}</td>
              <td className="px-3 py-2">
                <span className="text-neutral-600 dark:text-neutral-400">
                  {t.office_code}
                </span>
              </td>
              <td className="px-3 py-2">{t.type}</td>
              <td className="px-3 py-2">
                <StatusBadge status={t.status} />
              </td>
              <td className="max-w-xs truncate px-3 py-2 text-neutral-700 dark:text-neutral-300">
                {t.description ?? "—"}
              </td>
              <td className="px-3 py-2 text-right">
                <RowActions
                  transaction={t}
                  capabilities={capabilities}
                  onDone={refresh}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: TransactionSummary["status"] }) {
  const cls =
    status === "POSTED"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
      : status === "APPROVED"
        ? "bg-blue-100 text-blue-900 dark:bg-blue-950/60 dark:text-blue-100"
        : status === "PENDING"
          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
          : "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100";

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function RowActions({
  transaction: t,
  capabilities,
  onDone,
}: {
  transaction: TransactionSummary;
  capabilities: TransactionListProps["capabilities"];
  onDone: () => void;
}) {
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const approveMut = useMutation({
    mutationFn: () => approveTransactionAction(t.id, comment),
    onSuccess: (r) => {
      if (r.ok) {
        setError(null);
        setComment("");
        onDone();
      } else {
        setError(r.error);
      }
    },
  });

  const postMut = useMutation({
    mutationFn: () => postTransactionAction(t.id),
    onSuccess: (r) => {
      if (r.ok) {
        setError(null);
        onDone();
      } else {
        setError(r.error);
      }
    },
  });

  const reverseMut = useMutation({
    mutationFn: () => reverseTransactionAction(t.id, ""),
    onSuccess: (r) => {
      if (r.ok) {
        setError(null);
        onDone();
      } else {
        setError(r.error);
      }
    },
  });

  const showApprove =
    capabilities.canApprove && t.status === "PENDING" && t.type !== "REVERSAL";
  const showPost = capabilities.canPost && t.status === "APPROVED";
  const showReverse =
    capabilities.canReverse &&
    t.status === "POSTED" &&
    !t.is_reversed &&
    t.type !== "REVERSAL";

  if (!showApprove && !showPost && !showReverse) {
    return error ? (
      <span className="text-xs text-red-600">{error}</span>
    ) : null;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {showApprove && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            placeholder="Approval note"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-36 rounded border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900"
          />
          <button
            type="button"
            disabled={approveMut.isPending}
            onClick={() => approveMut.mutate()}
            className="rounded bg-blue-700 px-2 py-1 text-xs text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {approveMut.isPending ? "…" : "Approve"}
          </button>
        </div>
      )}
      {showPost && (
        <button
          type="button"
          disabled={postMut.isPending}
          onClick={() => postMut.mutate()}
          className="rounded bg-emerald-700 px-2 py-1 text-xs text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {postMut.isPending ? "Posting…" : "Post"}
        </button>
      )}
      {showReverse && (
        <button
          type="button"
          disabled={reverseMut.isPending}
          onClick={() => {
            if (
              typeof window !== "undefined" &&
              !window.confirm(
                "Create a reversal transaction (PENDING) for this posted entry?",
              )
            ) {
              return;
            }
            reverseMut.mutate();
          }}
          className="rounded border border-neutral-400 px-2 py-1 text-xs hover:bg-neutral-100 dark:border-neutral-500 dark:hover:bg-neutral-800"
        >
          {reverseMut.isPending ? "…" : "Reverse"}
        </button>
      )}
      <Link
        href={`${ROUTES.dashboardTransactions}/${t.id}`}
        className="text-xs text-neutral-700 underline-offset-4 hover:underline dark:text-neutral-300"
      >
        Details
      </Link>
    </div>
  );
}
