"use server";

import { revalidatePath } from "next/cache";

import { ensureUserProfileAction } from "@/app/actions/auth";
import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createCashClosing } from "@/services/cash-closing";
import { cashClosingFormSchema } from "@/validators/cash-closing";

export type CashClosingActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function revalidateCashClosings() {
  revalidatePath(ROUTES.dashboardCashClosings);
}

export async function createCashClosingAction(
  input: unknown,
): Promise<CashClosingActionResult> {
  const parsed = cashClosingFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const profile = await ensureUserProfileAction();
  if (!profile.ok) {
    return { ok: false, error: profile.error };
  }

  const { error } = await createCashClosing(user.id, parsed.data);
  if (error) {
    return { ok: false, error };
  }

  revalidateCashClosings();
  return { ok: true };
}
