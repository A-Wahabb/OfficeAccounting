import { z } from "zod";

export const TRANSACTION_TYPES_CREATE = [
  "RECEIPT",
  "PAYMENT",
  "TRANSFER",
  "DEPOSIT",
  "WITHDRAWAL",
] as const;

export type TransactionCreateType = (typeof TRANSACTION_TYPES_CREATE)[number];

const lineSchema = z.object({
  account_id: z.string().uuid("Select an account"),
  debit: z.number().min(0),
  credit: z.number().min(0),
  description: z.string().max(500).optional(),
});

export const transactionFormClientSchema = z
  .object({
    office_id: z.string().uuid("Office is required"),
    type: z.enum(TRANSACTION_TYPES_CREATE),
    currency: z.string().trim().min(3).max(8),
    description: z.string().max(2000).optional(),
    transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    items: z.array(lineSchema).min(2, "Add at least two lines"),
  })
  .superRefine((data, ctx) => {
    let debit = 0;
    let credit = 0;
    data.items.forEach((line, i) => {
      const d = line.debit;
      const c = line.credit;
      if (d > 0 && c > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each line must be debit or credit, not both",
          path: ["items", i, "debit"],
        });
      }
      if (d === 0 && c === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a debit or credit amount",
          path: ["items", i, "debit"],
        });
      }
      debit += d;
      credit += c;
    });
    if (debit !== credit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Debits (${debit.toFixed(2)}) must equal credits (${credit.toFixed(2)})`,
        path: ["items", 0, "debit"],
      });
    }
  });

export type TransactionFormValues = z.infer<typeof transactionFormClientSchema>;
