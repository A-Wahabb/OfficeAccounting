export type CashClosingStatus = "DRAFT" | "LOCKED";

export type CashClosing = {
  id: string;
  created_at: string;
  updated_at: string;
  office_id: string;
  closing_date: string;
  opening_balance: number;
  closing_balance: number;
  difference: number;
  status: CashClosingStatus;
  notes: string | null;
  created_by: string;
  closed_by: string;
};

export type CashClosingListRow = CashClosing & {
  office_code: string;
  office_name: string;
};
