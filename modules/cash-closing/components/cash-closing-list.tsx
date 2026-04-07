"use client";

import type { CashClosingListRow } from "@/types/cash-closing";

type CashClosingListProps = {
  rows: readonly CashClosingListRow[];
  currentUserId: string;
};

function formatClosedBy(closedBy: string, currentUserId: string): string {
  if (closedBy === currentUserId) {
    return "You";
  }
  return `${closedBy.slice(0, 8)}…`;
}

export function CashClosingList({ rows, currentUserId }: CashClosingListProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        No closings recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-900/50">
          <tr>
            <th className="px-3 py-2 font-medium">Office</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 text-right font-medium">Opening</th>
            <th className="px-3 py-2 text-right font-medium">Closing</th>
            <th className="px-3 py-2 text-right font-medium">Difference</th>
            <th className="px-3 py-2 font-medium">Closed by</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-neutral-200 dark:border-neutral-700"
            >
              <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                {r.office_code}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{r.closing_date}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.opening_balance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.closing_balance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.difference.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                {formatClosedBy(r.closed_by, currentUserId)}
              </td>
              <td className="px-3 py-2">
                <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs dark:bg-neutral-700">
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
