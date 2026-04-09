"use server";

import { revalidatePath } from "next/cache";

import { ensureUserProfileAction } from "@/app/actions/auth";
import { hasAnyRole } from "@/lib/auth/fetch-roles";
import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { listAccountsForOffice } from "@/services/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { transactionFormClientSchema } from "@/validators/transaction";
import { z } from "zod";

export type TransactionActionResult =
  | { ok: true; transactionId?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const idSchema = z.string().uuid();

function revalidateTransactions() {
  revalidatePath(ROUTES.dashboardTransactions);
  revalidatePath(ROUTES.dashboardTransactionsNew);
  revalidatePath(ROUTES.dashboardTransactionsApprovals);
}

/**
 * Each RPC runs in a single PostgreSQL transaction (implicit COMMIT on success, ROLLBACK on error).
 */
export async function listAccountsForOfficeAction(
  officeId: unknown,
): Promise<
  | { ok: true; accounts: Awaited<ReturnType<typeof listAccountsForOffice>> }
  | { ok: false; error: string }
> {
  const parsed = idSchema.safeParse(officeId);
  if (!parsed.success) {
    return { ok: false, error: "Invalid office" };
  }
  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }
  try {
    const accounts = await listAccountsForOffice(parsed.data);
    return { ok: true, accounts };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load accounts",
    };
  }
}

export async function createTransactionAction(
  input: unknown,
): Promise<TransactionActionResult> {
  const parsedForm = transactionFormClientSchema.safeParse(input);
  if (!parsedForm.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsedForm.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { user, roles } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  if (!hasAnyRole(roles, ["ADMIN", "ACCOUNTANT"])) {
    return { ok: false, error: "Only accountants can create transactions" };
  }

  const profile = await ensureUserProfileAction();
  if (!profile.ok) {
    return { ok: false, error: profile.error };
  }

  const v = parsedForm.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("fn_transaction_create", {
    p_office_id: v.office_id,
    p_type: v.type,
    p_currency: v.currency,
    p_description: v.description?.trim() ? v.description.trim() : null,
    p_transaction_date: v.transaction_date,
    p_items: v.items.map((line, idx) => ({
      account_id: line.account_id,
      debit: line.debit,
      credit: line.credit,
      line_number: idx + 1,
      description: line.description?.trim() ? line.description.trim() : null,
    })),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTransactions();
  return { ok: true, transactionId: data as string };
}

export async function approveTransactionAction(
  transactionId: unknown,
  comment: unknown,
): Promise<TransactionActionResult> {
  const idParsed = idSchema.safeParse(transactionId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid transaction" };
  }

  const commentStr =
    typeof comment === "string" ? comment : comment == null ? "" : String(comment);

  const { user, roles } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  if (!hasAnyRole(roles, ["ADMIN", "MANAGER"])) {
    return { ok: false, error: "Only managers can approve" };
  }

  const profile = await ensureUserProfileAction();
  if (!profile.ok) {
    return { ok: false, error: profile.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("fn_transaction_approve", {
    p_transaction_id: idParsed.data,
    p_comment: commentStr.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTransactions();
  return { ok: true };
}

export async function rejectTransactionAction(
  transactionId: unknown,
  _comment: unknown,
): Promise<TransactionActionResult> {
  const idParsed = idSchema.safeParse(transactionId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid transaction" };
  }

  const { user, roles } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  if (!hasAnyRole(roles, ["ADMIN", "MANAGER"])) {
    return { ok: false, error: "Only admin or manager can reject" };
  }

  const profile = await ensureUserProfileAction();
  if (!profile.ok) {
    return { ok: false, error: profile.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("transactions")
    .update({ status: "REJECTED" })
    .eq("id", idParsed.data)
    .eq("status", "PENDING");

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateTransactions();
  return { ok: true };
}
