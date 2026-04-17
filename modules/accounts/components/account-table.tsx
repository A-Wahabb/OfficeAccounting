"use client";

import type { AccountWithBalance } from "@/types/account";

type AccountTableProps = {
  accounts: AccountWithBalance[];
  onEdit: (row: AccountWithBalance) => void;
};

function formatBalance(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.length === 3 ? currency : "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function AccountTable({ accounts, onEdit }: AccountTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
          Chart of accounts
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Total balance is account opening balance plus the sum of{" "}
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
            account_balances
          </code>{" "}
          from posted transactions per office.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Scope</th>
              <th className="px-4 py-2 font-medium text-right">Balance</th>
              <th className="px-4 py-2 font-medium">Active</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {accounts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No accounts yet. Create one above.
                </td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 font-mono text-neutral-900 dark:text-neutral-100">
                    {a.code}
                  </td>
                  <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200">
                    {a.name}
                  </td>
                  <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">
                    {a.account_type}
                  </td>
                  <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                    {a.office_id ? (
                      <span className="text-xs">Office-specific</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                        Shared
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-neutral-900 dark:text-neutral-100">
                    {formatBalance(a.balance_total, a.currency)}
                  </td>
                  <td className="px-4 py-2">
                    {a.is_active ? (
                      <span className="text-green-700 dark:text-green-400">
                        Yes
                      </span>
                    ) : (
                      <span className="text-neutral-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => onEdit(a)}
                      className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
