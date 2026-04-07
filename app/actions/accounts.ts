"use server";

import { revalidatePath } from "next/cache";

import { createAccount, updateAccount } from "@/services/account";
import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import {
  accountFormClientSchema,
  accountFormSchema,
  accountFormValuesToInput,
} from "@/validators/account";
import { z } from "zod";

export type AccountActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const accountIdSchema = z.string().uuid();

function revalidateAccounts() {
  revalidatePath(ROUTES.dashboardAccounts);
}

export async function createAccountAction(
  input: unknown,
): Promise<AccountActionResult> {
  const client = accountFormClientSchema.safeParse(input);
  if (!client.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: client.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const payload = accountFormValuesToInput(client.data);
  const parsed = accountFormSchema.safeParse(payload);
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

  const { error } = await createAccount(user.id, parsed.data);
  if (error) {
    return { ok: false, error };
  }

  revalidateAccounts();
  return { ok: true };
}

export async function updateAccountAction(
  accountId: unknown,
  input: unknown,
): Promise<AccountActionResult> {
  const idParsed = accountIdSchema.safeParse(accountId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid account id" };
  }

  const client = accountFormClientSchema.safeParse(input);
  if (!client.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: client.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const payload = accountFormValuesToInput(client.data);
  const parsed = accountFormSchema.safeParse(payload);
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

  const { error } = await updateAccount(idParsed.data, parsed.data);
  if (error) {
    return { ok: false, error };
  }

  revalidateAccounts();
  return { ok: true };
}
