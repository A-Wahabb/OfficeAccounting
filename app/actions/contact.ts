"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/lib/constants/routes";
import { contactSchema, type ContactInput } from "@/validators/contact";

export type ContactActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function submitContact(
  input: unknown,
): Promise<ContactActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: flat.fieldErrors,
    };
  }

  await persistContact(parsed.data);
  revalidatePath(ROUTES.home);
  return { ok: true };
}

async function persistContact(data: ContactInput): Promise<void> {
  void data;
  // Replace with Supabase insert, external API, etc.
  await Promise.resolve();
}
