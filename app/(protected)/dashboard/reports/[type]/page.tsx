import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAccountingRole } from "@/lib/auth/guards";
import { ROUTES } from "@/lib/constants/routes";
import { reportQuerySchema } from "@/lib/reports/params";
import { buildReportBundle } from "@/services/reporting";
import type { ReportType } from "@/types/reporting";

type ReportPageProps = {
  params: { type: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

type ReportTypePage = Exclude<ReportType, "all">;

const REPORT_CONFIG: Record<
  ReportTypePage,
  { title: string; description: string; emptyText: string }
> = {
  trial_balance: {
    title: "Trial Balance",
    description: "View debit/credit totals and net balances for each account.",
    emptyText: "No trial balance entries found for this filter.",
  },
  headwise_expense: {
    title: "Headwise Expense Report",
    description: "Analyze expenses account-wise for the selected period.",
    emptyText: "No expense entries found for this filter.",
  },
  reconciliation: {
    title: "Reconciliation Report",
    description: "Review cash/bank ledger balances and prepare statement reconciliation.",
    emptyText: "No reconciliation rows found for this filter.",
  },
  general_ledger: {
    title: "General Ledger",
    description: "Inspect account-wise transaction lines with running balances.",
    emptyText: "No general ledger rows found for this filter.",
  },
  profit_and_loss: {
    title: "Profit and Loss",
    description: "Review income, expense, and net profit in the selected period.",
    emptyText: "No data to compute P&L for this filter.",
  },
  cash_flow: {
    title: "Cash Flow",
    description: "Track day-wise net movement in cash and bank accounts.",
    emptyText: "No cash flow rows found for this filter.",
  },
};

function getSingle(v: string | string[] | undefined): string {
  if (typeof v === "string") {
    return v;
  }
  return "";
}

function isReportTypePage(v: string): v is ReportTypePage {
  return v in REPORT_CONFIG;
}

function buildDownloadHref(
  type: ReportTypePage,
  from: string,
  to: string,
  officeId: string,
  accountId: string,
  format: "json" | "xlsx" | "pdf",
): string {
  const q = new URLSearchParams({
    from,
    to,
    report_type: type,
    format,
  });
  if (officeId) {
    q.set("office_id", officeId);
  }
  if (accountId) {
    q.set("account_id", accountId);
  }
  return `${ROUTES.apiReports}?${q.toString()}`;
}

export default async function ReportTypePage({
  params,
  searchParams,
}: ReportPageProps) {
  await requireAccountingRole();

  const typeRaw = params.type;
  if (!isReportTypePage(typeRaw)) {
    notFound();
  }
  const reportType = typeRaw;
  const config = REPORT_CONFIG[reportType];

  const defaultDate = new Date().toISOString().slice(0, 10);
  const from = getSingle(searchParams?.from) || defaultDate;
  const to = getSingle(searchParams?.to) || defaultDate;
  const officeId = getSingle(searchParams?.office_id);
  const accountId = getSingle(searchParams?.account_id);

  const parsed = reportQuerySchema.safeParse({
    from,
    to,
    office_id: officeId,
    account_id: accountId,
    format: "json",
    report_type: reportType,
  });

  let errorText: string | null = null;
  let bundle: Awaited<ReturnType<typeof buildReportBundle>> | null = null;
  if (parsed.success) {
    bundle = await buildReportBundle(parsed.data);
  } else {
    errorText =
      parsed.error.issues[0]?.message ?? "Invalid filters. Please review and retry.";
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={ROUTES.dashboardReports}
          className="text-sm text-neutral-600 underline-offset-4 hover:underline dark:text-neutral-400"
        >
          Back to all reports
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {config.title}
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {config.description}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Reports include approved transactions only.
        </p>
      </div>

      <form
        method="get"
        className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 md:grid-cols-2"
      >
        <label className="space-y-1">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">From</span>
          <input
            name="from"
            type="date"
            defaultValue={from}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">To</span>
          <input
            name="to"
            type="date"
            defaultValue={to}
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Office ID (optional)
          </span>
          <input
            name="office_id"
            type="text"
            defaultValue={officeId}
            placeholder="UUID"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            Account ID (optional)
          </span>
          <input
            name="account_id"
            type="text"
            defaultValue={accountId}
            placeholder="UUID"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </label>
        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            View result
          </button>
        </div>
      </form>

      {errorText && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {errorText}
        </p>
      )}

      {bundle && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={buildDownloadHref(
                reportType,
                from,
                to,
                officeId,
                accountId,
                "pdf",
              )}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Download PDF
            </Link>
            <Link
              href={buildDownloadHref(
                reportType,
                from,
                to,
                officeId,
                accountId,
                "xlsx",
              )}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Download Excel
            </Link>
            <Link
              href={buildDownloadHref(
                reportType,
                from,
                to,
                officeId,
                accountId,
                "json",
              )}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Open JSON
            </Link>
          </div>

          {reportType === "trial_balance" &&
            (bundle.trial_balance.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {config.emptyText}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Office</th>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.trial_balance.map((row) => (
                      <tr key={`${row.office_id}-${row.account_id}`} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2">{row.office_code}</td>
                        <td className="px-3 py-2">{row.account_code}</td>
                        <td className="px-3 py-2">{row.account_name}</td>
                        <td className="px-3 py-2 text-right">{row.debit_total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{row.credit_total.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{row.net_balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {reportType === "headwise_expense" &&
            (bundle.headwise_expense.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {config.emptyText}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Office</th>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-right">Expense Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.headwise_expense.map((row) => (
                      <tr key={`${row.office_id}-${row.account_id}`} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2">{row.office_code}</td>
                        <td className="px-3 py-2">{row.account_code}</td>
                        <td className="px-3 py-2">{row.account_name}</td>
                        <td className="px-3 py-2 text-right">{row.expense_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {reportType === "reconciliation" &&
            (bundle.reconciliation.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {config.emptyText}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Office</th>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-right">Ledger Balance</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.reconciliation.map((row) => (
                      <tr key={`${row.office_id}-${row.account_id}`} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2">{row.office_code}</td>
                        <td className="px-3 py-2">{row.account_code}</td>
                        <td className="px-3 py-2">{row.account_name}</td>
                        <td className="px-3 py-2 text-right">{row.ledger_balance.toFixed(2)}</td>
                        <td className="px-3 py-2">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {reportType === "general_ledger" &&
            (bundle.general_ledger.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {config.emptyText}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Txn</th>
                      <th className="px-3 py-2 text-left">Office</th>
                      <th className="px-3 py-2 text-left">Account</th>
                      <th className="px-3 py-2 text-right">Debit</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2 text-right">Running</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.general_ledger.map((row, idx) => (
                      <tr
                        key={`${row.transaction_number}-${row.account_id}-${idx}`}
                        className="border-t border-neutral-200 dark:border-neutral-800"
                      >
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2">{row.transaction_number}</td>
                        <td className="px-3 py-2">{row.office_code}</td>
                        <td className="px-3 py-2">
                          {row.account_code} - {row.account_name}
                        </td>
                        <td className="px-3 py-2 text-right">{row.debit.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{row.credit.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{row.running_balance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {reportType === "profit_and_loss" && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Income</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {bundle.profit_and_loss.income_total.toFixed(2)}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Expense</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {bundle.profit_and_loss.expense_total.toFixed(2)}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Net Profit</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {bundle.profit_and_loss.net_profit.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {reportType === "cash_flow" &&
            (bundle.cash_flow.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {config.emptyText}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Net Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.cash_flow.map((row) => (
                      <tr key={row.date} className="border-t border-neutral-200 dark:border-neutral-800">
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2 text-right">{row.net_change.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
