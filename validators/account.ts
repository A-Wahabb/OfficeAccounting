import { z } from "zod";

export const ACCOUNT_TYPES = [
  "CASH",
  "BANK",
  "EXPENSE",
  "REVENUE",
  "ASSET",
  "LIABILITY",
  "EQUITY",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);

/** RHF + zodResolver (empty string = shared). */
export const accountFormClientSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(64)
    .regex(/^[A-Za-z0-9_.-]+$/, "Use letters, numbers, dot, hyphen, or underscore"),
  name: z.string().trim().min(1, "Name is required").max(200),
  account_type: accountTypeSchema,
  office_id: z.union([z.literal(""), z.string().uuid()]),
  currency: z.string().trim().min(3).max(8),
  is_active: z.boolean(),
});

export type AccountFormValues = z.infer<typeof accountFormClientSchema>;

/** Server / service payload (null office = shared). */
export const accountFormSchema = z.object({
  code: accountFormClientSchema.shape.code,
  name: accountFormClientSchema.shape.name,
  account_type: accountTypeSchema,
  office_id: z.string().uuid().nullable(),
  currency: accountFormClientSchema.shape.currency,
  is_active: accountFormClientSchema.shape.is_active,
});

export type AccountFormInput = z.infer<typeof accountFormSchema>;

export function accountFormValuesToInput(
  values: AccountFormValues,
): AccountFormInput {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    account_type: values.account_type,
    office_id: values.office_id === "" ? null : values.office_id,
    currency: values.currency.trim(),
    is_active: values.is_active,
  };
}
