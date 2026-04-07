/** App route segments used for navigation and guards */
export const ROUTES = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",
  dashboardAdmin: "/dashboard/admin",
  dashboardManager: "/dashboard/manager",
  dashboardOffices: "/dashboard/offices",
  dashboardAccounts: "/dashboard/accounts",
  dashboardTransactions: "/dashboard/transactions",
  dashboardTransactionsNew: "/dashboard/transactions/new",
  dashboardTransactionsApprovals: "/dashboard/transactions/approvals",
  dashboardAssets: "/dashboard/assets",
  dashboardCashClosings: "/dashboard/cash-closings",
  /** GET ?from=&to=&office_id=&account_id=&format=json|xlsx|pdf (session required) */
  apiReports: "/api/reports",
} as const;
