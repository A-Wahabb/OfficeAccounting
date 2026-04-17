export const ASSET_KINDS = [
  "EQUIPMENT",
  "COMPUTER",
  "PROPERTY",
  "CASH",
  "BANK",
] as const;

export type AssetKind = (typeof ASSET_KINDS)[number];

export type Asset = {
  id: string;
  created_at: string;
  updated_at: string;
  asset_code: string;
  name: string;
  asset_kind: AssetKind;
  office_id: string;
  account_id: string | null;
  purchase_date: string | null;
  purchase_value: number;
  current_value: number;
  disposed_at: string | null;
};

export type AssetListRow = Asset & {
  office_code: string;
  office_name: string;
};

export type AssetLifecycleEventKind =
  | "PURCHASE"
  | "TRANSFER"
  | "MAINTENANCE"
  | "DISPOSAL";

export type AssetLifecycleEvent = {
  id: string;
  created_at: string;
  kind: AssetLifecycleEventKind;
  occurred_at: string;
  notes: string | null;
  from_office_id: string | null;
  to_office_id: string | null;
};
