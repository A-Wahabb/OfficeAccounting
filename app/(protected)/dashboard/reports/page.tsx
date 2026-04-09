import Link from "next/link";

import { requireAccountingRole } from "@/lib/auth/guards";
import { ROUTES } from "@/lib/constants/routes";

export default async function ReportsPage() {
  await requireAccountingRole();

  const reportPages = [
    {
      href: ROUTES.dashboardReportsTrialBalance,
      title: "Trial Balance",
      description: "Debit/credit totals and net per account.",
    },
    {
      href: ROUTES.dashboardReportsHeadwiseExpense,
      title: "Headwise Expense",
      description: "Expense totals grouped by account head.",
    },
    {
      href: ROUTES.dashboardReportsReconciliation,
      title: "Reconciliation",
      description: "Ledger balances of cash/bank accounts for statement matching.",
    },
    {
      href: ROUTES.dashboardReportsGeneralLedger,
      title: "General Ledger",
      description: "Detailed account movements with running balance.",
    },
    {
      href: ROUTES.dashboardReportsProfitAndLoss,
      title: "Profit and Loss",
      description: "Income, expenses, and net profit for the period.",
    },
    {
      href: ROUTES.dashboardReportsCashFlow,
      title: "Cash Flow",
      description: "Day-wise cash/bank net changes.",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Reports
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Open a report type to apply filters, preview results, then download.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reportPages.map((report) => (
          <Link
            key={report.href}
            href={report.href}
            className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
          >
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
              {report.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {report.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
