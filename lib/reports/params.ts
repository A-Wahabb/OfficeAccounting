import { z } from "zod";

export const reportTypeSchema = z.enum([
  "all",
  "trial_balance",
  "headwise_expense",
  "reconciliation",
  "general_ledger",
  "profit_and_loss",
  "cash_flow",
]);

export const reportQuerySchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD"),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD"),
    office_id: z
      .union([z.string().uuid(), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    account_id: z
      .union([z.string().uuid(), z.literal("")])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
    format: z.enum(["json", "xlsx", "pdf"]).optional().default("pdf"),
    report_type: reportTypeSchema.optional().default("all"),
  })
  .refine((q) => q.from <= q.to, {
    message: "from must be on or before to",
    path: ["from"],
  });

export type ReportQuery = z.infer<typeof reportQuerySchema>;
