import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TransactionDetail, TransactionSummary } from "@/types/transaction";

const TX_SELECT = `
  id,
  transaction_number,
  office_id,
  type,
  status,
  transaction_date,
  currency,
  description,
  is_reversed,
  reversal_of_transaction_id,
  created_at
`;

function mapSummary(
  row: Record<string, unknown>,
  officeMap: Map<string, { code: string; name: string }>,
  amountMap: Map<string, number>,
): TransactionSummary {
  const oid = row.office_id as string;
  const o = officeMap.get(oid);
  const txId = row.id as string;
  return {
    id: txId,
    transaction_number: row.transaction_number as string,
    office_id: oid,
    office_code: o?.code ?? "",
    office_name: o?.name ?? "",
    type: row.type as TransactionSummary["type"],
    status: row.status as TransactionSummary["status"],
    transaction_date: row.transaction_date as string,
    currency: row.currency as string,
    description: (row.description as string | null) ?? null,
    total_amount: amountMap.get(txId) ?? 0,
    is_reversed: row.is_reversed as boolean,
    reversal_of_transaction_id:
      (row.reversal_of_transaction_id as string | null) ?? null,
    created_at: row.created_at as string,
  };
}

async function loadTransactionAmountMap(
  transactionIds: string[],
): Promise<Map<string, number>> {
  const supabase = await createSupabaseServerClient();
  const unique = Array.from(new Set(transactionIds.filter(Boolean)));
  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("transaction_items")
    .select("transaction_id, debit")
    .in("transaction_id", unique);

  if (error) {
    throw new Error(error.message);
  }

  const amountMap = new Map<string, number>();
  for (const raw of data ?? []) {
    const row = raw as { transaction_id: string; debit: number | string };
    const amt = Number(row.debit);
    amountMap.set(row.transaction_id, (amountMap.get(row.transaction_id) ?? 0) + amt);
  }

  return amountMap;
}

async function loadOfficeMap(
  officeIds: string[],
): Promise<Map<string, { code: string; name: string }>> {
  const supabase = await createSupabaseServerClient();
  const unique = Array.from(new Set(officeIds));
  if (unique.length === 0) {
    return new Map();
  }
  const { data, error } = await supabase
    .from("offices")
    .select("id, code, name")
    .in("id", unique);

  if (error) {
    throw new Error(error.message);
  }

  const m = new Map<string, { code: string; name: string }>();
  for (const r of data ?? []) {
    const row = r as { id: string; code: string; name: string };
    m.set(row.id, { code: row.code, name: row.name });
  }
  return m;
}

export async function listTransactions(options?: {
  status?: TransactionSummary["status"] | TransactionSummary["status"][];
}): Promise<TransactionSummary[]> {
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("transactions")
    .select(TX_SELECT)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.status) {
    const arr = Array.isArray(options.status)
      ? options.status
      : [options.status];
    q = q.in("status", arr);
  }

  const { data, error } = await q;

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const officeMap = await loadOfficeMap(
    rows.map((r) => r.office_id as string),
  );
  const amountMap = await loadTransactionAmountMap(rows.map((r) => r.id as string));

  return rows.map((r) => mapSummary(r, officeMap, amountMap));
}

export async function getTransactionWithItems(
  id: string,
): Promise<TransactionDetail | null> {
  const supabase = await createSupabaseServerClient();

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select(TX_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (txErr) {
    throw new Error(txErr.message);
  }

  if (!tx) {
    return null;
  }

  const row = tx as Record<string, unknown>;
  const officeMap = await loadOfficeMap([row.office_id as string]);
  const amountMap = await loadTransactionAmountMap([row.id as string]);

  const { data: items, error: itemErr } = await supabase
    .from("transaction_items")
    .select("id, line_number, account_id, debit, credit, description")
    .eq("transaction_id", id)
    .order("line_number", { ascending: true });

  if (itemErr) {
    throw new Error(itemErr.message);
  }

  const itemRows = items ?? [];
  const accIds = Array.from(
    new Set(itemRows.map((it) => (it as { account_id: string }).account_id)),
  );
  const accMap = new Map<string, { code: string; name: string }>();
  if (accIds.length > 0) {
    const { data: accs, error: accErr } = await supabase
      .from("accounts")
      .select("id, code, name")
      .in("id", accIds);
    if (accErr) {
      throw new Error(accErr.message);
    }
    for (const a of accs ?? []) {
      const ar = a as { id: string; code: string; name: string };
      accMap.set(ar.id, { code: ar.code, name: ar.name });
    }
  }

  const summary = mapSummary(row, officeMap, amountMap);

  const mappedItems = itemRows.map((it) => {
    const r = it as {
      id: string;
      line_number: number;
      account_id: string;
      debit: string | number;
      credit: string | number;
      description: string | null;
    };
    const a = accMap.get(r.account_id);
    return {
      id: r.id,
      line_number: r.line_number,
      account_id: r.account_id,
      account_code: a?.code ?? "",
      account_name: a?.name ?? "",
      debit: Number(r.debit),
      credit: Number(r.credit),
      description: r.description ?? null,
    };
  });

  return { ...summary, items: mappedItems };
}
