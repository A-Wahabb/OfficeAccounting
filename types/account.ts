import type { AccountType } from "@/validators/account";

export type { AccountType };

export type Account = {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  office_id: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Aggregated balance across all offices (same currency assumed). */
export type AccountWithBalance = Account & {
  balance_total: number;
};
