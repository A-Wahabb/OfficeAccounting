import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportOfficeAccountFilters } from "@/components/reports/report-office-account-filters";
import { requireAccountingRole } from "@/lib/auth/guards";
import { ROUTES } from "@/lib/constants/routes";
import { reportQuerySchema } from "@/lib/reports/params";
import { listActiveAccountsForReportFilter } from "@/services/account";
import { listOffices } from "@/services/office";
import { buildReportBundle } from "@/services/reporting";
import type { ReportType } from "@/types/reporting";

type ReportPageProps = {
  params: { type: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

type ReportTypePage = Exclude<ReportType, "all">;
type ReportBundleData = Awaited<ReturnType<typeof buildReportBundle>>;

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

function formatAmount(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildSummaryCards(
  reportType: ReportTypePage,
  bundle: ReportBundleData,
): { label: string; value: string }[] {
  if (reportType === "trial_balance") {
    const debit = bundle.trial_balance.reduce((sum, r) => sum + r.debit_total, 0);
    const credit = bundle.trial_balance.reduce((sum, r) => sum + r.credit_total, 0);
    return [
      { label: "Rows", value: String(bundle.trial_balance.length) },
      { label: "Total Debit", value: formatAmount(debit) },
      { label: "Total Credit", value: formatAmount(credit) },
    ];
  }
  if (reportType === "headwise_expense") {
    const total = bundle.headwise_expense.reduce((sum, r) => sum + r.expense_total, 0);
    return [
      { label: "Rows", value: String(bundle.headwise_expense.length) },
      { label: "Total Expense", value: formatAmount(total) },
    ];
  }
  if (reportType === "reconciliation") {
    const totalLedger = bundle.reconciliation.reduce((s, r) => s + r.ledger_balance, 0);
    return [
      { label: "Rows", value: String(bundle.reconciliation.length) },
      { label: "Total Ledger", value: formatAmount(totalLedger) },
    ];
  }
  if (reportType === "general_ledger") {
    return [
      { label: "Entries", value: String(bundle.general_ledger.length) },
      { label: "Transactions", value: String(bundle.transactions.length) },
    ];
  }
  if (reportType === "profit_and_loss") {
    return [
      { label: "Income", value: formatAmount(bundle.profit_and_loss.income_total) },
      { label: "Expense", value: formatAmount(bundle.profit_and_loss.expense_total) },
      { label: "Net Profit", value: formatAmount(bundle.profit_and_loss.net_profit) },
    ];
  }
  return [
    { label: "Days", value: String(bundle.cash_flow.length) },
    {
      label: "Net Movement",
      value: formatAmount(bundle.cash_flow.reduce((sum, r) => sum + r.net_change, 0)),
    },
  ];
}

export default async function ReportTypePage({
  params,
  searchParams,
}: ReportPageProps) {
  await requireAccountingRole();

  const [offices, accounts] = await Promise.all([
    listOffices(),
    listActiveAccountsForReportFilter(),
  ]);

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
      <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
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
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="rounded-full border border-neutral-200 px-2 py-0.5 dark:border-neutral-700">
            Period: {from} to {to}
          </span>
          <span className="rounded-full border border-neutral-200 px-2 py-0.5 dark:border-neutral-700">
            Approved transactions only
          </span>
        </div>
      </div>

      <form
        method="get"
        className="grid grid-cols-1 gap-4 rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950 md:grid-cols-2"
      >
        <p className="md:col-span-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
          Report filters
        </p>
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
        <ReportOfficeAccountFilters
          key={`${officeId}-${accountId}`}
          offices={offices}
          accounts={accounts}
          defaultOfficeId={officeId}
          defaultAccountId={accountId}
        />
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
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {buildSummaryCards(reportType, bundle).map((card) => (
                <div
                  key={card.label}
                  className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900"
                >
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{card.label}</p>
                  <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>
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
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
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
          </div>

          {reportType === "trial_balance" &&
            (bundle.trial_balance.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {config.emptyText}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
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
                      <tr key={`${row.office_id}-${row.account_id}`} className="border-t border-neutral-200 odd:bg-white even:bg-neutral-50/70 dark:border-neutral-800 dark:odd:bg-neutral-950 dark:even:bg-neutral-900/40">
                        <td className="px-3 py-2">{row.office_name}</td>
                        <td className="px-3 py-2">{row.account_code}</td>
                        <td className="px-3 py-2">{row.account_name}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.debit_total)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.credit_total)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.net_balance)}</td>
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
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
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
                      <tr key={`${row.office_id}-${row.account_id}`} className="border-t border-neutral-200 odd:bg-white even:bg-neutral-50/70 dark:border-neutral-800 dark:odd:bg-neutral-950 dark:even:bg-neutral-900/40">
                        <td className="px-3 py-2">{row.office_name}</td>
                        <td className="px-3 py-2">{row.account_code}</td>
                        <td className="px-3 py-2">{row.account_name}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.expense_total)}</td>
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
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
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
                      <tr key={`${row.office_id}-${row.account_id}`} className="border-t border-neutral-200 odd:bg-white even:bg-neutral-50/70 dark:border-neutral-800 dark:odd:bg-neutral-950 dark:even:bg-neutral-900/40">
                        <td className="px-3 py-2">{row.office_name}</td>
                        <td className="px-3 py-2">{row.account_code}</td>
                        <td className="px-3 py-2">{row.account_name}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.ledger_balance)}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-xs dark:border-neutral-700">
                            {row.status}
                          </span>
                        </td>
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
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
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
                        className="border-t border-neutral-200 odd:bg-white even:bg-neutral-50/70 dark:border-neutral-800 dark:odd:bg-neutral-950 dark:even:bg-neutral-900/40"
                      >
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2">{row.transaction_number}</td>
                        <td className="px-3 py-2">{row.office_name}</td>
                        <td className="px-3 py-2">
                          {row.account_code} - {row.account_name}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.debit)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.credit)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.running_balance)}</td>
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
                  {formatAmount(bundle.profit_and_loss.income_total)}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Expense</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {formatAmount(bundle.profit_and_loss.expense_total)}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Net Profit</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {formatAmount(bundle.profit_and_loss.net_profit)}
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
              <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Net Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.cash_flow.map((row) => (
                      <tr key={row.date} className="border-t border-neutral-200 odd:bg-white even:bg-neutral-50/70 dark:border-neutral-800 dark:odd:bg-neutral-950 dark:even:bg-neutral-900/40">
                        <td className="px-3 py-2">{row.date}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatAmount(row.net_change)}</td>
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
