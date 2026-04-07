import { z } from "zod";

import type { AssetKind } from "@/types/asset";
import { ASSET_KINDS } from "@/types/asset";

export const assetKindSchema = z.enum(ASSET_KINDS);

export const assetFormClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  asset_kind: assetKindSchema,
  office_id: z.string().uuid("Office is required"),
  purchase_date: z.union([
    z.literal(""),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  ]),
  purchase_value: z.number().min(0, "Must be ≥ 0"),
  current_value: z.number().min(0, "Must be ≥ 0"),
});

export type AssetFormValues = z.infer<typeof assetFormClientSchema>;

export type AssetFormInput = {
  name: string;
  asset_kind: AssetKind;
  office_id: string;
  purchase_date: string | null;
  purchase_value: number;
  current_value: number;
};

export function assetFormValuesToInput(values: AssetFormValues): AssetFormInput {
  return {
    name: values.name.trim(),
    asset_kind: values.asset_kind,
    office_id: values.office_id,
    purchase_date: values.purchase_date === "" ? null : values.purchase_date,
    purchase_value: values.purchase_value,
    current_value: values.current_value,
  };
}
