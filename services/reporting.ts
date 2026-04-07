import type {
  ReportBalanceRow,
  ReportBundle,
  ReportCashFlowRow,
  ReportTransaction,
  ReportTransactionLine,
} from "@/types/reporting";
import type { ReportQuery } from "@/lib/reports/params";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function loadOfficeMap(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) {
    return new Map();
  }
  const { data, error } = await supabase
    .from("offices")
    .select("id, code")
    .in("id", unique);

  if (error) {
    throw new Error(error.message);
  }

  const m = new Map<string, string>();
  for (const r of data ?? []) {
    const row = r as { id: string; code: string };
    m.set(row.id, row.code);
  }
  return m;
}

function signedLineAmount(
  debit: number,
  credit: number,
  txType: string,
): number {
  const raw = debit - credit;
  return txType === "REVERSAL" ? -raw : raw;
}

/**
 * Posted transactions in [from, to], optional office and account (line) filters.
 */
export async function buildReportBundle(
  query: ReportQuery,
): Promise<ReportBundle> {
  const supabase = await createSupabaseServerClient();

  let txQuery = supabase
    .from("transactions")
    .select(
      `
      id,
      transaction_number,
      office_id,
      type,
      status,
      transaction_date,
      currency,
      description,
      transaction_items (
        line_number,
        debit,
        credit,
        account_id,
        accounts (
          code,
          name,
          account_type
        )
      )
    `,
    )
    .eq("status", "POSTED")
    .gte("transaction_date", query.from)
    .lte("transaction_date", query.to)
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (query.office_id) {
    txQuery = txQuery.eq("office_id", query.office_id);
  }

  const { data: txRows, error: txErr } = await txQuery;

  if (txErr) {
    throw new Error(txErr.message);
  }

  const rawTx = (txRows ?? []) as Record<string, unknown>[];

  let transactions: ReportTransaction[] = rawTx.map((row) => {
    const items = (row.transaction_items ?? []) as Record<string, unknown>[];
    const lines: ReportTransactionLine[] = items.map((it) => {
      const accRaw = it.accounts;
      const acc = (
        Array.isArray(accRaw) ? accRaw[0] : accRaw
      ) as Record<string, unknown> | undefined;
      const a = acc ?? {};
      return {
        line_number: Number(it.line_number),
        account_id: it.account_id as string,
        account_code: String(a.code ?? ""),
        account_name: String(a.name ?? ""),
        account_type: String(a.account_type ?? ""),
        debit: Number(it.debit),
        credit: Number(it.credit),
      };
    });

    return {
      id: row.id as string,
      transaction_number: row.transaction_number as string,
      office_id: row.office_id as string,
      office_code: "",
      type: row.type as string,
      transaction_date: row.transaction_date as string,
      currency: row.currency as string,
      description: (row.description as string | null) ?? null,
      lines,
    };
  });

  if (query.account_id) {
    transactions = transactions.filter((t) =>
      t.lines.some((l) => l.account_id === query.account_id),
    );
  }

  const officeIds = Array.from(
    new Set(transactions.map((t) => t.office_id)),
  ) as string[];
  const officeCodes = await loadOfficeMap(supabase, officeIds);
  transactions = transactions.map((t) => ({
    ...t,
    office_code: officeCodes.get(t.office_id) ?? "",
  }));

  /** Balances: current posted balances from account_balances (RLS-scoped). */
  let balQuery = supabase.from("account_balances").select(
    `
      account_id,
      office_id,
      balance,
      accounts (
        code,
        name,
        account_type
      )
    `,
  );

  if (query.office_id) {
    balQuery = balQuery.eq("office_id", query.office_id);
  }
  if (query.account_id) {
    balQuery = balQuery.eq("account_id", query.account_id);
  }

  const { data: balRows, error: balErr } = await balQuery;

  if (balErr) {
    throw new Error(balErr.message);
  }

  const balOfficeIds = Array.from(
    new Set((balRows ?? []).map((r) => (r as { office_id: string }).office_id)),
  );
  const balOfficeCodes = await loadOfficeMap(supabase, balOfficeIds);

  const balances: ReportBalanceRow[] = (balRows ?? []).map((r) => {
    const row = r as {
      account_id: string;
      office_id: string;
      balance: string | number;
      accounts:
        | { code: string; name: string; account_type: string }
        | { code: string; name: string; account_type: string }[]
        | null;
    };
    const accRaw = row.accounts;
    const acc = (Array.isArray(accRaw) ? accRaw[0] : accRaw) ?? {
      code: "",
      name: "",
      account_type: "",
    };
    return {
      account_id: row.account_id,
      account_code: acc.code,
      account_name: acc.name,
      account_type: acc.account_type,
      office_id: row.office_id,
      office_code: balOfficeCodes.get(row.office_id) ?? "",
      balance: Number(row.balance),
    };
  });

  /** Cash flow: daily net signed movement on CASH and BANK accounts (in range). */
  const cashByDate = new Map<string, number>();

  for (const t of transactions) {
    const txType = t.type;
    for (const line of t.lines) {
      if (line.account_type !== "CASH" && line.account_type !== "BANK") {
        continue;
      }
      const amt = signedLineAmount(line.debit, line.credit, txType);
      const d = t.transaction_date;
      cashByDate.set(d, (cashByDate.get(d) ?? 0) + amt);
    }
  }

  const cash_flow: ReportCashFlowRow[] = Array.from(cashByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, net_change]) => ({ date, net_change }));

  return {
    filters: {
      from: query.from,
      to: query.to,
      office_id: query.office_id,
      account_id: query.account_id,
    },
    transactions,
    balances,
    cash_flow,
  };
}
