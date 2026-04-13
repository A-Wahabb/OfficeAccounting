export type ReportTransactionLine = {
  line_number: number;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
};

export type ReportType =
  | "all"
  | "trial_balance"
  | "headwise_expense"
  | "reconciliation"
  | "general_ledger"
  | "profit_and_loss"
  | "cash_flow";

export type ReportTransaction = {
  id: string;
  transaction_number: string;
  office_id: string;
  office_code: string;
  office_name: string;
  type: string;
  transaction_date: string;
  currency: string;
  description: string | null;
  lines: ReportTransactionLine[];
};

export type ReportBalanceRow = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  office_id: string;
  office_code: string;
  office_name: string;
  balance: number;
};

/** Net movement on CASH/BANK accounts per day (approved lines, reversal-aware). */
export type ReportCashFlowRow = {
  date: string;
  net_change: number;
};

export type ReportTrialBalanceRow = {
  office_id: string;
  office_code: string;
  office_name: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit_total: number;
  credit_total: number;
  net_balance: number;
};

export type ReportHeadwiseExpenseRow = {
  office_id: string;
  office_code: string;
  office_name: string;
  account_id: string;
  account_code: string;
  account_name: string;
  expense_total: number;
};

export type ReportReconciliationRow = {
  office_id: string;
  office_code: string;
  office_name: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  ledger_balance: number;
  statement_amount: number | null;
  difference: number | null;
  status: "PENDING_STATEMENT";
};

export type ReportGeneralLedgerRow = {
  date: string;
  transaction_number: string;
  office_id: string;
  office_code: string;
  office_name: string;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  running_balance: number;
};

export type ReportProfitAndLoss = {
  income_total: number;
  expense_total: number;
  net_profit: number;
};

export type ReportBundle = {
  filters: {
    from: string;
    to: string;
    office_id: string | null;
    account_id: string | null;
    report_type: ReportType;
  };
  transactions: ReportTransaction[];
  balances: ReportBalanceRow[];
  cash_flow: ReportCashFlowRow[];
  trial_balance: ReportTrialBalanceRow[];
  headwise_expense: ReportHeadwiseExpenseRow[];
  reconciliation: ReportReconciliationRow[];
  general_ledger: ReportGeneralLedgerRow[];
  profit_and_loss: ReportProfitAndLoss;
};
