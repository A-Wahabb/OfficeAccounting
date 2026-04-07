import type { SupabaseClient } from "@supabase/supabase-js";

import type { Office, OfficeStatus } from "@/types/office";
import type { OfficeFormInput } from "@/validators/office";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OFFICE_SELECT =
  "id, name, code, is_head_office, status, created_at, updated_at";

function mapRow(row: {
  id: string;
  name: string;
  code: string;
  is_head_office: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}): Office {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    is_head_office: row.is_head_office,
    status: row.status === "inactive" ? "inactive" : "active",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Clears head-office flag on all rows except `exceptId` when provided (for updates).
 */
async function clearOtherHeadOffices(
  supabase: SupabaseClient,
  exceptId?: string,
): Promise<{ error: Error | null }> {
  let q = supabase.from("offices").update({ is_head_office: false }).eq(
    "is_head_office",
    true,
  );
  if (exceptId) {
    q = q.neq("id", exceptId);
  }
  const { error } = await q;
  return { error: error ? new Error(error.message) : null };
}

export async function listOffices(): Promise<Office[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("offices")
    .select(OFFICE_SELECT)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapRow);
}

export async function getOfficeById(id: string): Promise<Office | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("offices")
    .select(OFFICE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRow(data as Parameters<typeof mapRow>[0]) : null;
}

export async function createOffice(
  userId: string,
  input: OfficeFormInput,
): Promise<{ office: Office | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  if (input.is_head_office) {
    const { error } = await clearOtherHeadOffices(supabase);
    if (error) {
      return { office: null, error: error.message };
    }
  }

  const { data, error } = await supabase
    .from("offices")
    .insert({
      name: input.name,
      code: input.code,
      is_head_office: input.is_head_office,
      status: input.status as OfficeStatus,
      created_by: userId,
    })
    .select(OFFICE_SELECT)
    .single();

  if (error) {
    return { office: null, error: error.message };
  }

  return { office: data ? mapRow(data as Parameters<typeof mapRow>[0]) : null, error: null };
}

export async function updateOffice(
  id: string,
  input: OfficeFormInput,
): Promise<{ office: Office | null; error: string | null }> {
  const supabase = await createSupabaseServerClient();

  if (input.is_head_office) {
    const { error } = await clearOtherHeadOffices(supabase, id);
    if (error) {
      return { office: null, error: error.message };
    }
  }

  const { data, error } = await supabase
    .from("offices")
    .update({
      name: input.name,
      code: input.code,
      is_head_office: input.is_head_office,
      status: input.status as OfficeStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(OFFICE_SELECT)
    .single();

  if (error) {
    return { office: null, error: error.message };
  }

  return { office: data ? mapRow(data as Parameters<typeof mapRow>[0]) : null, error: null };
}

export async function deactivateOffice(
  id: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("offices")
    .update({
      status: "inactive" as OfficeStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
