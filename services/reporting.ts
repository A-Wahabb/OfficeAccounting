import type {
  ReportBalanceRow,
  ReportBundle,
  ReportCashFlowRow,
  ReportGeneralLedgerRow,
  ReportHeadwiseExpenseRow,
  ReportProfitAndLoss,
  ReportReconciliationRow,
  ReportTransaction,
  ReportTransactionLine,
  ReportTrialBalanceRow,
} from "@/types/reporting";
import type { ReportQuery } from "@/lib/reports/params";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function loadOfficeMap(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, { code: string; name: string }>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
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

function signedLineAmount(
  debit: number,
  credit: number,
  txType: string,
): number {
  const raw = debit - credit;
  return txType === "REVERSAL" ? -raw : raw;
}

function isExpenseType(accountType: string): boolean {
  return accountType.toUpperCase() === "EXPENSE";
}

function isIncomeType(accountType: string): boolean {
  return accountType.toUpperCase() === "INCOME";
}

function isCashOrBank(accountType: string): boolean {
  const t = accountType.toUpperCase();
  return t === "CASH" || t === "BANK";
}

function pickOpeningReceiver(
  officeIds: string[],
  officeFilter: string | null,
): string | null {
  if (officeIds.length === 0) {
    return officeFilter;
  }
  if (officeFilter && officeIds.includes(officeFilter)) {
    return officeFilter;
  }
  const sorted = [...officeIds].sort((a, b) => a.localeCompare(b));
  return sorted[0] ?? null;
}

/** Approved transactions in [from, to], optional office/account filters. */
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
  const filteredRawTx = rawTx.filter(
    (row) => String(row.status ?? "") === "APPROVED",
  );

  let transactions: ReportTransaction[] = filteredRawTx.map((row) => {
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
      office_name: "",
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
    office_code: officeCodes.get(t.office_id)?.code ?? "",
    office_name: officeCodes.get(t.office_id)?.name ?? "",
  }));

  const txAccountIds = new Set<string>();
  for (const t of transactions) {
    for (const line of t.lines) {
      txAccountIds.add(line.account_id);
    }
  }

  /** Balances: current ledger balances from account_balances (RLS-scoped). */
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
  const balAccountIds = new Set<string>();
  for (const r of balRows ?? []) {
    const row = r as { account_id: string };
    balAccountIds.add(row.account_id);
  }

  const allAccountIds = Array.from(
    new Set([
      ...Array.from(txAccountIds),
      ...Array.from(balAccountIds),
      ...(query.account_id ? [query.account_id] : []),
    ]),
  );
  const accountOpeningById = new Map<string, number>();
  const accountMetaById = new Map<
    string,
    { code: string; name: string; account_type: string; office_id: string | null }
  >();
  if (allAccountIds.length > 0) {
    const { data: openingRows, error: openingErr } = await supabase
      .from("accounts")
      .select("id, code, name, account_type, office_id, opening_balance")
      .in("id", allAccountIds);
    if (openingErr) {
      throw new Error(openingErr.message);
    }
    for (const r of openingRows ?? []) {
      const row = r as {
        id: string;
        code: string;
        name: string;
        account_type: string;
        office_id: string | null;
        opening_balance: string | number;
      };
      const raw = row.opening_balance;
      const n = typeof raw === "string" ? parseFloat(raw) : raw;
      accountOpeningById.set(row.id, Number.isFinite(n) ? n : 0);
      accountMetaById.set(row.id, {
        code: row.code,
        name: row.name,
        account_type: row.account_type,
        office_id: row.office_id,
      });
    }
  }

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
      office_code: balOfficeCodes.get(row.office_id)?.code ?? "",
      office_name: balOfficeCodes.get(row.office_id)?.name ?? "",
      balance: Number(row.balance),
    };
  });

  const balanceOfficeIdsByAccount = new Map<string, Set<string>>();
  for (const row of balances) {
    const set = balanceOfficeIdsByAccount.get(row.account_id) ?? new Set<string>();
    set.add(row.office_id);
    balanceOfficeIdsByAccount.set(row.account_id, set);
  }
  const openingAppliedInBalance = new Set<string>();
  for (const row of balances) {
    const opening = accountOpeningById.get(row.account_id) ?? 0;
    if (opening === 0 || openingAppliedInBalance.has(row.account_id)) {
      continue;
    }
    const offices = Array.from(balanceOfficeIdsByAccount.get(row.account_id) ?? []);
    const receiver = pickOpeningReceiver(offices, query.office_id);
    if (receiver && row.office_id === receiver) {
      row.balance += opening;
      openingAppliedInBalance.add(row.account_id);
    }
  }
  for (const [accountId, opening] of Array.from(accountOpeningById.entries())) {
    if (opening === 0 || openingAppliedInBalance.has(accountId)) {
      continue;
    }
    const meta = accountMetaById.get(accountId);
    if (!meta) {
      continue;
    }
    const receiverOfficeId =
      query.office_id ?? meta.office_id ?? "shared";
    balances.push({
      account_id: accountId,
      account_code: meta.code,
      account_name: meta.name,
      account_type: meta.account_type,
      office_id: receiverOfficeId,
      office_code:
        receiverOfficeId === "shared"
          ? "SHARED"
          : (balOfficeCodes.get(receiverOfficeId)?.code ?? ""),
      office_name:
        receiverOfficeId === "shared"
          ? "Shared"
          : (balOfficeCodes.get(receiverOfficeId)?.name ?? ""),
      balance: opening,
    });
    openingAppliedInBalance.add(accountId);
  }

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

  const trialMap = new Map<string, ReportTrialBalanceRow>();
  const expenseMap = new Map<string, ReportHeadwiseExpenseRow>();
  const glRows: Omit<ReportGeneralLedgerRow, "running_balance">[] = [];

  let incomeTotal = 0;
  let expenseTotal = 0;

  for (const t of transactions) {
    for (const line of t.lines) {
      const trialKey = `${t.office_id}::${line.account_id}`;
      const trial = trialMap.get(trialKey) ?? {
        office_id: t.office_id,
        office_code: t.office_code,
        office_name: t.office_name,
        account_id: line.account_id,
        account_code: line.account_code,
        account_name: line.account_name,
        account_type: line.account_type,
        debit_total: 0,
        credit_total: 0,
        net_balance: 0,
      };
      trial.debit_total += line.debit;
      trial.credit_total += line.credit;
      trial.net_balance = trial.debit_total - trial.credit_total;
      trialMap.set(trialKey, trial);

      glRows.push({
        date: t.transaction_date,
        transaction_number: t.transaction_number,
        office_id: t.office_id,
        office_code: t.office_code,
        office_name: t.office_name,
        account_id: line.account_id,
        account_code: line.account_code,
        account_name: line.account_name,
        debit: line.debit,
        credit: line.credit,
      });

      const signed = signedLineAmount(line.debit, line.credit, t.type);
      if (isExpenseType(line.account_type)) {
        const expenseKey = `${t.office_id}::${line.account_id}`;
        const expense = expenseMap.get(expenseKey) ?? {
          office_id: t.office_id,
          office_code: t.office_code,
          office_name: t.office_name,
          account_id: line.account_id,
          account_code: line.account_code,
          account_name: line.account_name,
          expense_total: 0,
        };
        expense.expense_total += signed;
        expenseMap.set(expenseKey, expense);
        expenseTotal += signed;
      } else if (isIncomeType(line.account_type)) {
        incomeTotal += -signed;
      }
    }
  }

  const trial_balance = Array.from(trialMap.values()).sort((a, b) => {
    const off = a.office_name.localeCompare(b.office_name);
    if (off !== 0) {
      return off;
    }
    return a.account_code.localeCompare(b.account_code);
  });

  const trialOfficeIdsByAccount = new Map<string, Set<string>>();
  for (const row of trial_balance) {
    const set = trialOfficeIdsByAccount.get(row.account_id) ?? new Set<string>();
    set.add(row.office_id);
    trialOfficeIdsByAccount.set(row.account_id, set);
  }
  const openingAppliedInTrial = new Set<string>();
  for (const row of trial_balance) {
    const opening = accountOpeningById.get(row.account_id) ?? 0;
    if (opening === 0 || openingAppliedInTrial.has(row.account_id)) {
      continue;
    }
    const offices = Array.from(trialOfficeIdsByAccount.get(row.account_id) ?? []);
    const receiver = pickOpeningReceiver(offices, query.office_id);
    if (receiver && row.office_id === receiver) {
      row.net_balance += opening;
      openingAppliedInTrial.add(row.account_id);
    }
  }
  for (const [accountId, opening] of Array.from(accountOpeningById.entries())) {
    if (opening === 0 || openingAppliedInTrial.has(accountId)) {
      continue;
    }
    const meta = accountMetaById.get(accountId);
    if (!meta) {
      continue;
    }
    const receiverOfficeId =
      query.office_id ?? meta.office_id ?? "shared";
    const officeName =
      receiverOfficeId === "shared"
        ? "Shared"
        : (officeCodes.get(receiverOfficeId)?.name ??
          balOfficeCodes.get(receiverOfficeId)?.name ??
          "");
    const officeCode =
      receiverOfficeId === "shared"
        ? "SHARED"
        : (officeCodes.get(receiverOfficeId)?.code ??
          balOfficeCodes.get(receiverOfficeId)?.code ??
          "");
    trial_balance.push({
      office_id: receiverOfficeId,
      office_code: officeCode,
      office_name: officeName,
      account_id: accountId,
      account_code: meta.code,
      account_name: meta.name,
      account_type: meta.account_type,
      debit_total: 0,
      credit_total: 0,
      net_balance: opening,
    });
    openingAppliedInTrial.add(accountId);
  }
  trial_balance.sort((a, b) => {
    const off = a.office_name.localeCompare(b.office_name);
    if (off !== 0) {
      return off;
    }
    return a.account_code.localeCompare(b.account_code);
  });

  const headwise_expense = Array.from(expenseMap.values())
    .filter((r) => r.expense_total !== 0)
    .sort((a, b) => {
      const off = a.office_name.localeCompare(b.office_name);
      if (off !== 0) {
        return off;
      }
      return a.account_code.localeCompare(b.account_code);
    });

  const general_ledger: ReportGeneralLedgerRow[] = [];
  const runningByAccount = new Map<string, number>();
  const sortedGl = glRows.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) {
      return dateCmp;
    }
    const txnCmp = a.transaction_number.localeCompare(b.transaction_number);
    if (txnCmp !== 0) {
      return txnCmp;
    }
    return a.account_code.localeCompare(b.account_code);
  });

  for (const row of sortedGl) {
    const key = row.account_id;
    const base =
      runningByAccount.get(key) ?? (accountOpeningById.get(row.account_id) ?? 0);
    const next = base + (row.debit - row.credit);
    runningByAccount.set(key, next);
    general_ledger.push({
      ...row,
      running_balance: next,
    });
  }

  const reconciliation: ReportReconciliationRow[] = balances
    .filter((b) => isCashOrBank(b.account_type))
    .map((b) => ({
      office_id: b.office_id,
      office_code: b.office_code,
      office_name: b.office_name,
      account_id: b.account_id,
      account_code: b.account_code,
      account_name: b.account_name,
      account_type: b.account_type,
      ledger_balance: b.balance,
      statement_amount: null,
      difference: null,
      status: "PENDING_STATEMENT" as const,
    }))
    .sort((a, b) => {
      const off = a.office_name.localeCompare(b.office_name);
      if (off !== 0) {
        return off;
      }
      return a.account_code.localeCompare(b.account_code);
    });

  const profit_and_loss: ReportProfitAndLoss = {
    income_total: Number(incomeTotal.toFixed(2)),
    expense_total: Number(expenseTotal.toFixed(2)),
    net_profit: Number((incomeTotal - expenseTotal).toFixed(2)),
  };

  return {
    filters: {
      from: query.from,
      to: query.to,
      office_id: query.office_id,
      account_id: query.account_id,
      report_type: query.report_type,
    },
    transactions,
    balances,
    cash_flow,
    trial_balance,
    headwise_expense,
    reconciliation,
    general_ledger,
    profit_and_loss,
  };
}
