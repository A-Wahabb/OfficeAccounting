export type ReportTransactionLine = {
  line_number: number;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
};

export type ReportTransaction = {
  id: string;
  transaction_number: string;
  office_id: string;
  office_code: string;
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
  balance: number;
};

/** Net movement on CASH/BANK accounts per day (posted lines, reversal-aware). */
export type ReportCashFlowRow = {
  date: string;
  net_change: number;
};

export type ReportBundle = {
  filters: {
    from: string;
    to: string;
    office_id: string | null;
    account_id: string | null;
  };
  transactions: ReportTransaction[];
  balances: ReportBalanceRow[];
  cash_flow: ReportCashFlowRow[];
};
