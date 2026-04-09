"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { AppRole } from "@/lib/auth/types";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ProtectedNavProps = {
  email: string;
  roles: AppRole[];
};

type NavItem = {
  href: string;
  label: string;
};

function hasAnyRole(roles: AppRole[], allowed: readonly AppRole[]): boolean {
  return allowed.some((r) => roles.includes(r));
}

export function ProtectedNav({ email, roles }: ProtectedNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const baseItems: NavItem[] = [{ href: ROUTES.dashboardOverview, label: "Overview" }];

  const accountingItems: NavItem[] = hasAnyRole(roles, [
    "ADMIN",
    "MANAGER",
    "ACCOUNTANT",
  ])
    ? [
        { href: ROUTES.dashboardTransactions, label: "Transactions" },
        { href: ROUTES.dashboardAssets, label: "Assets" },
        { href: ROUTES.dashboardCashClosings, label: "Cash Closings" },
      ]
    : [];
  const reportItems: NavItem[] = hasAnyRole(roles, ["ADMIN", "MANAGER", "ACCOUNTANT"])
    ? [
        { href: ROUTES.dashboardReportsTrialBalance, label: "Trial Balance" },
        { href: ROUTES.dashboardReportsHeadwiseExpense, label: "Headwise Expense" },
        { href: ROUTES.dashboardReportsReconciliation, label: "Reconciliation" },
        { href: ROUTES.dashboardReportsGeneralLedger, label: "General Ledger" },
        { href: ROUTES.dashboardReportsProfitAndLoss, label: "Profit & Loss" },
        { href: ROUTES.dashboardReportsCashFlow, label: "Cash Flow" },
      ]
    : [];
  const isOnReportsPage = useMemo(
    () => pathname === ROUTES.dashboardReports || pathname.startsWith(`${ROUTES.dashboardReports}/`),
    [pathname],
  );
  const [reportsOpen, setReportsOpen] = useState(isOnReportsPage);

  const managementItems: NavItem[] = hasAnyRole(roles, ["ADMIN", "MANAGER"])
    ? [
        { href: ROUTES.dashboardManager, label: "Manager" },
        { href: ROUTES.dashboardAccounts, label: "Accounts" },
      ]
    : [];

  const adminItems: NavItem[] = roles.includes("ADMIN")
    ? [
        { href: ROUTES.dashboardOffices, label: "Offices" },
        { href: ROUTES.dashboardAdmin, label: "Admin" },
      ]
    : [];

  const onSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push(ROUTES.login);
    router.refresh();
  };

  const navClass = (href: string) => {
    const active =
      href === ROUTES.dashboardOverview
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);
    return [
      "block rounded-md px-3 py-2 text-sm transition-colors",
      active
        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
    ].join(" ");
  };

  return (
    <aside className="w-full rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 lg:sticky lg:top-4">
      <div className="mb-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">Signed in</p>
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {email}
        </p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {roles.join(", ")}
        </p>
      </div>

      <nav className="space-y-2">
        {baseItems.map((item) => (
          <Link key={item.href} href={item.href} className={navClass(item.href)}>
            {item.label}
          </Link>
        ))}
        {accountingItems.map((item) => (
          <Link key={item.href} href={item.href} className={navClass(item.href)}>
            {item.label}
          </Link>
        ))}
        {reportItems.length > 0 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setReportsOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              aria-expanded={reportsOpen}
              aria-controls="reports-nav-section"
            >
              <span>Reports</span>
              <span className="text-sm">{reportsOpen ? "-" : "+"}</span>
            </button>
            {reportsOpen && (
              <div id="reports-nav-section" className="mt-1 space-y-2">
                {reportItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${navClass(item.href)} pl-6`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        {managementItems.map((item) => (
          <Link key={item.href} href={item.href} className={navClass(item.href)}>
            {item.label}
          </Link>
        ))}
        {adminItems.map((item) => (
          <Link key={item.href} href={item.href} className={navClass(item.href)}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
