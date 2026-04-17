"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import {
  createAsset,
  disposeAsset,
  getAssetById,
  listAssetLifecycleEvents,
  recordMaintenance,
  transferAsset,
  updateAsset,
} from "@/services/asset";
import {
  assetFormClientSchema,
  assetFormValuesToInput,
} from "@/validators/asset";

export type AssetActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const assetIdSchema = z.string().uuid();
const officeIdSchema = z.string().uuid();

function revalidateAssets() {
  revalidatePath(ROUTES.dashboardAssets);
}

export async function createAssetAction(
  input: unknown,
): Promise<AssetActionResult> {
  const client = assetFormClientSchema.safeParse(input);
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

  const payload = assetFormValuesToInput(client.data);

  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { asset, error } = await createAsset(user.id, payload);
  if (asset) {
    revalidateAssets();
    revalidatePath(ROUTES.dashboardAccounts);
  }
  if (error) {
    return { ok: false, error };
  }

  return { ok: true };
}

export async function updateAssetAction(
  assetId: unknown,
  input: unknown,
): Promise<AssetActionResult> {
  const idParsed = assetIdSchema.safeParse(assetId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid asset id" };
  }

  const client = assetFormClientSchema.safeParse(input);
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

  const payload = assetFormValuesToInput(client.data);

  const existing = await getAssetById(idParsed.data);
  if (!existing) {
    return { ok: false, error: "Asset not found" };
  }
  if (existing.disposed_at) {
    return { ok: false, error: "Disposed assets cannot be edited" };
  }

  const { error } = await updateAsset(idParsed.data, payload);
  if (error) {
    return { ok: false, error };
  }

  revalidateAssets();
  return { ok: true };
}

export async function listAssetEventsAction(
  assetId: unknown,
): Promise<
  | { ok: true; events: Awaited<ReturnType<typeof listAssetLifecycleEvents>> }
  | { ok: false; error: string }
> {
  const idParsed = assetIdSchema.safeParse(assetId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid asset id" };
  }

  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  try {
    const events = await listAssetLifecycleEvents(idParsed.data);
    return { ok: true, events };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to load events",
    };
  }
}

export async function transferAssetAction(
  assetId: unknown,
  toOfficeId: unknown,
  notes: unknown,
): Promise<AssetActionResult> {
  const idParsed = assetIdSchema.safeParse(assetId);
  const officeParsed = officeIdSchema.safeParse(toOfficeId);
  if (!idParsed.success || !officeParsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const noteStr =
    typeof notes === "string" ? notes.trim() || null : null;

  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { error } = await transferAsset(
    user.id,
    idParsed.data,
    officeParsed.data,
    noteStr,
  );
  if (error) {
    return { ok: false, error };
  }

  revalidateAssets();
  return { ok: true };
}

export async function maintenanceAssetAction(
  assetId: unknown,
  notes: unknown,
): Promise<AssetActionResult> {
  const idParsed = assetIdSchema.safeParse(assetId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid asset id" };
  }

  const n = typeof notes === "string" ? notes.trim() : "";
  if (!n) {
    return { ok: false, error: "Notes are required for maintenance" };
  }

  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { error } = await recordMaintenance(user.id, idParsed.data, n);
  if (error) {
    return { ok: false, error };
  }

  revalidateAssets();
  return { ok: true };
}

export async function disposeAssetAction(
  assetId: unknown,
  notes: unknown,
): Promise<AssetActionResult> {
  const idParsed = assetIdSchema.safeParse(assetId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid asset id" };
  }

  const noteStr =
    typeof notes === "string" ? notes.trim() || null : null;

  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { error } = await disposeAsset(user.id, idParsed.data, noteStr);
  if (error) {
    return { ok: false, error };
  }

  revalidateAssets();
  return { ok: true };
}
