import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Account, AccountWithBalance } from "@/types/account";
import type { AccountFormInput } from "@/validators/account";

const ACCOUNT_SELECT = `
  id,
  code,
  name,
  account_type,
  office_id,
  currency,
  is_active,
  created_at,
  updated_at
`;

function mapAccount(row: {
  id: string;
  code: string;
  name: string;
  account_type: string;
  office_id: string | null;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}): Account {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    account_type: row.account_type as Account["account_type"],
    office_id: row.office_id,
    currency: row.currency,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * List accounts ordered by code. Balances are summed from account_balances (updated when transactions POST).
 */
export async function listAccountsWithBalances(): Promise<AccountWithBalance[]> {
  const supabase = await createSupabaseServerClient();

  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .order("code", { ascending: true });

  if (accErr) {
    throw new Error(accErr.message);
  }

  const rows = accounts ?? [];
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((r) => r.id);
  const { data: balRows, error: balErr } = await supabase
    .from("account_balances")
    .select("account_id, balance")
    .in("account_id", ids);

  if (balErr) {
    throw new Error(balErr.message);
  }

  const sumByAccount = new Map<string, number>();
  for (const b of balRows ?? []) {
    const aid = (b as { account_id: string; balance: string | number })
      .account_id;
    const raw = (b as { balance: string | number }).balance;
    const n = typeof raw === "string" ? parseFloat(raw) : raw;
    sumByAccount.set(aid, (sumByAccount.get(aid) ?? 0) + (Number.isFinite(n) ? n : 0));
  }

  return rows.map((r) => {
    const a = mapAccount(r as Parameters<typeof mapAccount>[0]);
    return {
      ...a,
      balance_total: sumByAccount.get(a.id) ?? 0,
    };
  });
}

/** Active accounts for report filters (searchable dropdown by code/name). */
export async function listActiveAccountsForReportFilter(): Promise<
  Pick<Account, "id" | "code" | "name">[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Pick<Account, "id" | "code" | "name">[];
}

/** Active accounts usable for a transaction in an office (shared + office-specific). */
export async function listAccountsForOffice(officeId: string): Promise<Account[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("is_active", true)
    .or(`office_id.is.null,office_id.eq.${officeId}`)
    .order("code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((r) => mapAccount(r as Parameters<typeof mapAccount>[0]));
}

export async function getAccountById(id: string): Promise<Account | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAccount(data as Parameters<typeof mapAccount>[0]) : null;
}

export async function createAccount(
  userId: string,
  input: AccountFormInput,
): Promise<{ account: Account | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      code: input.code,
      name: input.name,
      account_type: input.account_type,
      office_id: input.office_id,
      currency: input.currency,
      is_active: input.is_active,
      created_by: userId,
      metadata: {},
    })
    .select(ACCOUNT_SELECT)
    .single();

  if (error) {
    return { account: null, error: error.message };
  }

  return {
    account: data ? mapAccount(data as Parameters<typeof mapAccount>[0]) : null,
    error: null,
  };
}

export async function updateAccount(
  id: string,
  input: AccountFormInput,
): Promise<{ account: Account | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("accounts")
    .update({
      name: input.name,
      account_type: input.account_type,
      office_id: input.office_id,
      currency: input.currency,
      is_active: input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ACCOUNT_SELECT)
    .single();

  if (error) {
    return { account: null, error: error.message };
  }

  return {
    account: data ? mapAccount(data as Parameters<typeof mapAccount>[0]) : null,
    error: null,
  };
}
