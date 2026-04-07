export type TransactionType =
  | "RECEIPT"
  | "PAYMENT"
  | "TRANSFER"
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "REVERSAL";

export type TransactionStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "POSTED";

export type TransactionSummary = {
  id: string;
  transaction_number: string;
  office_id: string;
  office_code: string;
  office_name: string;
  type: TransactionType;
  status: TransactionStatus;
  transaction_date: string;
  currency: string;
  description: string | null;
  is_reversed: boolean;
  reversal_of_transaction_id: string | null;
  created_at: string;
};

export type TransactionLine = {
  id: string;
  line_number: number;
  account_id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string | null;
};

export type TransactionDetail = TransactionSummary & {
  items: TransactionLine[];
};
