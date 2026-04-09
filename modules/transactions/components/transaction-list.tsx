"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  approveTransactionAction,
  rejectTransactionAction,
} from "@/app/actions/transactions";
import { ROUTES } from "@/lib/constants/routes";
import type { TransactionSummary } from "@/types/transaction";

type TransactionListProps = {
  transactions: readonly TransactionSummary[];
  capabilities: {
    canApprove: boolean;
    canReject: boolean;
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
            <th className="px-3 py-2 font-medium text-right">Amount</th>
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
                  {t.office_name || t.office_code}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {t.total_amount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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
    status === "APPROVED"
      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
      : status === "PENDING"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
        : "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-100";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approveMut = useMutation({
    mutationFn: () => approveTransactionAction(t.id, ""),
    onSuccess: (r) => {
      if (r.ok) {
        setError(null);
        setMenuOpen(false);
        onDone();
      } else {
        setError(r.error);
      }
    },
  });

  const rejectMut = useMutation({
    mutationFn: () => rejectTransactionAction(t.id),
    onSuccess: (r) => {
      if (r.ok) {
        setError(null);
        setMenuOpen(false);
        onDone();
      } else {
        setError(r.error);
      }
    },
  });

  const showApprove =
    capabilities.canApprove && t.status === "PENDING" && t.type !== "REVERSAL";
  const showReject = capabilities.canReject && t.status === "PENDING";
  const hasMutationAction = showApprove || showReject;

  return (
    <div className="relative inline-flex flex-col items-end gap-1">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded p-1 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        aria-label="Open row actions"
        aria-expanded={menuOpen}
      >
        ...
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-8 z-10 min-w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <Link
            href={`${ROUTES.dashboardTransactions}/${t.id}`}
            className="block rounded px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            onClick={() => setMenuOpen(false)}
          >
            Details
          </Link>
          {showApprove && (
            <button
              type="button"
              disabled={approveMut.isPending}
              onClick={() => approveMut.mutate()}
              className="block w-full rounded px-3 py-2 text-left text-xs text-blue-700 hover:bg-neutral-100 disabled:opacity-60 dark:text-blue-300 dark:hover:bg-neutral-800"
            >
              {approveMut.isPending ? "Approving..." : "Approve"}
            </button>
          )}
          {showReject && (
            <button
              type="button"
              disabled={rejectMut.isPending}
              onClick={() => rejectMut.mutate()}
              className="block w-full rounded px-3 py-2 text-left text-xs text-rose-700 hover:bg-neutral-100 disabled:opacity-60 dark:text-rose-300 dark:hover:bg-neutral-800"
            >
              {rejectMut.isPending ? "Rejecting..." : "Reject"}
            </button>
          )}
          {!hasMutationAction && (
            <p className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400">
              No additional actions
            </p>
          )}
        </div>
      )}
      {/* Keep details always accessible regardless of status */}
      {!menuOpen && (
        <button
          onClick={() => setMenuOpen(true)}
          className="sr-only"
        >
          Open actions menu
        </button>
      )}
    </div>
  );
}
