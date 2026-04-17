import { randomBytes } from "crypto";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Asset, AssetLifecycleEvent, AssetListRow } from "@/types/asset";
import type { AssetFormInput } from "@/validators/asset";

const ASSET_SELECT = `
  id,
  created_at,
  updated_at,
  asset_code,
  name,
  asset_kind,
  office_id,
  account_id,
  purchase_date,
  purchase_value,
  current_value,
  disposed_at
`;

function mapAsset(row: Record<string, unknown>): Asset {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    asset_code: row.asset_code as string,
    name: row.name as string,
    asset_kind: row.asset_kind as Asset["asset_kind"],
    office_id: row.office_id as string,
    account_id: (row.account_id as string | null) ?? null,
    purchase_date: (row.purchase_date as string | null) ?? null,
    purchase_value: Number(row.purchase_value),
    current_value: Number(row.current_value),
    disposed_at: (row.disposed_at as string | null) ?? null,
  };
}

async function assertCashBankAccountForOffice(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  officeId: string,
  accountId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, account_type, office_id")
    .eq("id", accountId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Ledger account not found" };
  }
  const row = data as { account_type: string; office_id: string | null };
  const t = row.account_type.toUpperCase();
  if (t !== "CASH" && t !== "BANK") {
    return { ok: false, error: "Ledger account must be CASH or BANK type" };
  }
  if (row.office_id != null && row.office_id !== officeId) {
    return { ok: false, error: "That account belongs to a different office" };
  }
  return { ok: true };
}

/** Sets initial ledger balance for (account, office) when registering a cash/bank asset. */
async function applyOpeningBalanceForNewAsset(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  officeId: string,
  accountId: string,
  openingBalance: number,
): Promise<{ error: string | null }> {
  if (openingBalance === 0) {
    return { error: null };
  }

  const { data: existing, error: selErr } = await supabase
    .from("account_balances")
    .select("id, balance")
    .eq("account_id", accountId)
    .eq("office_id", officeId)
    .maybeSingle();

  if (selErr) {
    return { error: selErr.message };
  }

  if (existing) {
    const bal = Number((existing as { balance: string | number }).balance);
    if (!Number.isFinite(bal)) {
      return { error: "Invalid existing balance for this account" };
    }
    if (bal !== 0) {
      return {
        error:
          "This ledger account already has a non-zero balance for this office. Pick another account or adjust via transactions.",
      };
    }
    const { error: upErr } = await supabase
      .from("account_balances")
      .update({
        balance: openingBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", (existing as { id: string }).id);
    return { error: upErr?.message ?? null };
  }

  const { error: insErr } = await supabase.from("account_balances").insert({
    created_by: userId,
    account_id: accountId,
    office_id: officeId,
    balance: openingBalance,
  });
  return { error: insErr?.message ?? null };
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

export async function listAssetsWithOffices(): Promise<AssetListRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assets")
    .select(ASSET_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const officeMap = await loadOfficeMap(rows.map((r) => r.office_id as string));

  return rows.map((r) => {
    const a = mapAsset(r);
    const o = officeMap.get(a.office_id);
    return {
      ...a,
      office_code: o?.code ?? "",
      office_name: o?.name ?? "",
    };
  });
}

export async function getAssetById(id: string): Promise<Asset | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("assets")
    .select(ASSET_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapAsset(data as Record<string, unknown>) : null;
}

function generateAssetCode(): string {
  return `A-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createAsset(
  userId: string,
  input: AssetFormInput,
): Promise<{ asset: Asset | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const isCashBank = input.asset_kind === "CASH" || input.asset_kind === "BANK";
  let linkedAccountId: string | null = null;
  if (isCashBank) {
    if (!input.account_id) {
      return { asset: null, error: "Ledger account is required for cash or bank assets" };
    }
    const accOk = await assertCashBankAccountForOffice(
      supabase,
      input.office_id,
      input.account_id,
    );
    if (!accOk.ok) {
      return { asset: null, error: accOk.error };
    }
    linkedAccountId = input.account_id;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const asset_code = generateAssetCode();

    const { data, error } = await supabase
      .from("assets")
      .insert({
        created_by: userId,
        office_id: input.office_id,
        account_id: linkedAccountId,
        asset_code,
        name: input.name,
        asset_kind: input.asset_kind,
        purchase_date: input.purchase_date,
        purchase_value: input.purchase_value,
        current_value: input.current_value,
        salvage_value: 0,
        metadata: {},
      })
      .select(ASSET_SELECT)
      .single();

    if (!error && data) {
      const asset = mapAsset(data as Record<string, unknown>);

      const { error: evErr } = await supabase.from("asset_lifecycle_events").insert({
        created_by: userId,
        asset_id: asset.id,
        kind: "PURCHASE",
        occurred_at: new Date().toISOString(),
        notes: null,
        from_office_id: null,
        to_office_id: input.office_id,
        metadata: isCashBank
          ? { opening_balance: input.opening_balance, account_id: linkedAccountId }
          : {},
      });

      if (evErr) {
        return { asset: null, error: evErr.message };
      }

      if (isCashBank && linkedAccountId) {
        const balErr = await applyOpeningBalanceForNewAsset(
          supabase,
          userId,
          input.office_id,
          linkedAccountId,
          input.opening_balance,
        );
        if (balErr.error) {
          return {
            asset,
            error: `${balErr.error} The asset was saved; set the ledger balance from Chart of Accounts if needed.`,
          };
        }
      }

      return { asset, error: null };
    }

    if (error?.code !== "23505") {
      return { asset: null, error: error.message };
    }
  }

  return { asset: null, error: "Could not allocate a unique asset code" };
}

export async function updateAsset(
  id: string,
  input: AssetFormInput,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("assets")
    .update({
      name: input.name,
      asset_kind: input.asset_kind,
      purchase_date: input.purchase_date,
      purchase_value: input.purchase_value,
      current_value: input.current_value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function listAssetLifecycleEvents(
  assetId: string,
): Promise<AssetLifecycleEvent[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("asset_lifecycle_events")
    .select(
      "id, created_at, kind, occurred_at, notes, from_office_id, to_office_id",
    )
    .eq("asset_id", assetId)
    .order("occurred_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: row.id as string,
      created_at: row.created_at as string,
      kind: row.kind as AssetLifecycleEvent["kind"],
      occurred_at: row.occurred_at as string,
      notes: (row.notes as string | null) ?? null,
      from_office_id: (row.from_office_id as string | null) ?? null,
      to_office_id: (row.to_office_id as string | null) ?? null,
    };
  });
}

export async function transferAsset(
  userId: string,
  assetId: string,
  toOfficeId: string,
  notes: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const existing = await getAssetById(assetId);
  if (!existing) {
    return { error: "Asset not found" };
  }
  if (existing.disposed_at) {
    return { error: "Disposed assets cannot be transferred" };
  }
  if (existing.office_id === toOfficeId) {
    return { error: "Choose a different office" };
  }

  const fromOfficeId = existing.office_id;

  const { error: upErr } = await supabase
    .from("assets")
    .update({
      office_id: toOfficeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  if (upErr) {
    return { error: upErr.message };
  }

  const { error: evErr } = await supabase.from("asset_lifecycle_events").insert({
    created_by: userId,
    asset_id: assetId,
    kind: "TRANSFER",
    occurred_at: new Date().toISOString(),
    notes,
    from_office_id: fromOfficeId,
    to_office_id: toOfficeId,
    metadata: {},
  });

  if (evErr) {
    return { error: evErr.message };
  }

  return { error: null };
}

export async function recordMaintenance(
  userId: string,
  assetId: string,
  notes: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const existing = await getAssetById(assetId);
  if (!existing) {
    return { error: "Asset not found" };
  }
  if (existing.disposed_at) {
    return { error: "Disposed assets cannot receive maintenance entries" };
  }

  const { error } = await supabase.from("asset_lifecycle_events").insert({
    created_by: userId,
    asset_id: assetId,
    kind: "MAINTENANCE",
    occurred_at: new Date().toISOString(),
    notes: notes.trim() || null,
    from_office_id: null,
    to_office_id: null,
    metadata: {},
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function disposeAsset(
  userId: string,
  assetId: string,
  notes: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();

  const existing = await getAssetById(assetId);
  if (!existing) {
    return { error: "Asset not found" };
  }
  if (existing.disposed_at) {
    return { error: "Asset is already disposed" };
  }

  const disposalDate = new Date().toISOString().slice(0, 10);

  const { error: upErr } = await supabase
    .from("assets")
    .update({
      disposed_at: disposalDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  if (upErr) {
    return { error: upErr.message };
  }

  const { error: evErr } = await supabase.from("asset_lifecycle_events").insert({
    created_by: userId,
    asset_id: assetId,
    kind: "DISPOSAL",
    occurred_at: new Date().toISOString(),
    notes,
    from_office_id: existing.office_id,
    to_office_id: null,
    metadata: {},
  });

  if (evErr) {
    return { error: evErr.message };
  }

  return { error: null };
}
