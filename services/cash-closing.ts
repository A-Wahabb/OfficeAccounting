import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashClosing, CashClosingListRow } from "@/types/cash-closing";
import type { CashClosingFormValues } from "@/validators/cash-closing";

const ROW_SELECT = `
  id,
  created_at,
  updated_at,
  office_id,
  closing_date,
  opening_balance,
  closing_balance,
  difference,
  status,
  notes,
  created_by,
  closed_by
`;

function mapRow(row: Record<string, unknown>): CashClosing {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    office_id: row.office_id as string,
    closing_date: row.closing_date as string,
    opening_balance: Number(row.opening_balance),
    closing_balance: Number(row.closing_balance),
    difference: Number(row.difference),
    status: row.status as CashClosing["status"],
    notes: (row.notes as string | null) ?? null,
    created_by: row.created_by as string,
    closed_by: row.closed_by as string,
  };
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

export async function listCashClosingsWithOffices(): Promise<CashClosingListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_closings")
    .select(ROW_SELECT)
    .order("closing_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const officeMap = await loadOfficeMap(rows.map((r) => r.office_id as string));

  return rows.map((r) => {
    const base = mapRow(r);
    const o = officeMap.get(base.office_id);
    return {
      ...base,
      office_code: o?.code ?? "",
      office_name: o?.name ?? "",
    };
  });
}

export async function createCashClosing(
  userId: string,
  input: CashClosingFormValues,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const difference = input.closing_balance - input.opening_balance;

  const { error } = await supabase.from("cash_closings").insert({
    created_by: userId,
    closed_by: userId,
    office_id: input.office_id,
    closing_date: input.closing_date,
    opening_balance: input.opening_balance,
    closing_balance: input.closing_balance,
    difference,
    status: "LOCKED",
    notes: null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        error:
          "A cash closing already exists for this office on this date. Only one closing per day per office is allowed.",
      };
    }
    return { error: error.message };
  }

  return { error: null };
}
