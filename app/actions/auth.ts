"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Ensures a row exists in public.users for the current auth user (for user_roles FK).
 */
export async function ensureUserProfileAction() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Not signed in" };
  }

  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name:
        (user.user_metadata?.full_name as string | undefined) ??
        user.email?.split("@")[0] ??
        null,
      created_by: user.id,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
