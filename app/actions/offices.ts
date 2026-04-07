"use server";

import { revalidatePath } from "next/cache";

import {
  createOffice,
  deactivateOffice,
  updateOffice,
} from "@/services/office";
import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { officeFormSchema, officeIdSchema } from "@/validators/office";

export type OfficeActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function revalidateOffices() {
  revalidatePath(ROUTES.dashboardOffices);
}

export async function createOfficeAction(
  input: unknown,
): Promise<OfficeActionResult> {
  const parsed = officeFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { error } = await createOffice(user.id, parsed.data);
  if (error) {
    return { ok: false, error };
  }

  revalidateOffices();
  return { ok: true };
}

export async function updateOfficeAction(
  officeId: unknown,
  input: unknown,
): Promise<OfficeActionResult> {
  const idParsed = officeIdSchema.safeParse(officeId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid office id" };
  }

  const parsed = officeFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Validation failed",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const { user } = await getServerSession();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const { error } = await updateOffice(idParsed.data, parsed.data);
  if (error) {
    return { ok: false, error };
  }

  revalidateOffices();
  return { ok: true };
}

export async function deactivateOfficeAction(
  officeId: unknown,
): Promise<OfficeActionResult> {
  const idParsed = officeIdSchema.safeParse(officeId);
  if (!idParsed.success) {
    return { ok: false, error: "Invalid office id" };
  }

  const session = await getServerSession();
  if (!session.user) {
    return { ok: false, error: "Not signed in" };
  }

  const { error } = await deactivateOffice(idParsed.data);
  if (error) {
    return { ok: false, error };
  }

  revalidateOffices();
  return { ok: true };
}
