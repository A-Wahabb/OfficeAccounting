import { z } from "zod";

export const officeStatusSchema = z.enum(["active", "inactive"]);

export const officeFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphen, or underscore"),
  is_head_office: z.boolean(),
  status: officeStatusSchema,
});

export type OfficeFormInput = z.infer<typeof officeFormSchema>;

export const officeIdSchema = z.string().uuid();
