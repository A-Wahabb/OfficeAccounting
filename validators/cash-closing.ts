import { z } from "zod";

export const CASH_CLOSING_STATUSES = ["DRAFT", "LOCKED"] as const;

export type CashClosingStatus = (typeof CASH_CLOSING_STATUSES)[number];

export const cashClosingFormSchema = z.object({
  office_id: z.string().uuid("Office is required"),
  closing_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  opening_balance: z.number(),
  closing_balance: z.number(),
});

export type CashClosingFormValues = z.infer<typeof cashClosingFormSchema>;
