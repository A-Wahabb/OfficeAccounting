"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Asset, AssetListRow } from "@/types/asset";
import type { Office } from "@/types/office";

import { AssetForm } from "./asset-form";
import { AssetList } from "./asset-list";

function listRowToAsset(row: AssetListRow): Asset {
  return {
    id: row.id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    asset_code: row.asset_code,
    name: row.name,
    asset_kind: row.asset_kind,
    office_id: row.office_id,
    purchase_date: row.purchase_date,
    purchase_value: row.purchase_value,
    current_value: row.current_value,
    disposed_at: row.disposed_at,
  };
}

type AssetManagementProps = {
  initialAssets: AssetListRow[];
  offices: Pick<Office, "id" | "name" | "code">[];
};

export function AssetManagement({
  initialAssets,
  offices,
}: AssetManagementProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Asset | null>(null);

  const handleSuccess = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          {editing ? "Edit asset" : "Register purchase"}
        </h2>
        <AssetForm
          mode={editing ? "edit" : "create"}
          asset={editing}
          offices={offices}
          onSuccess={handleSuccess}
          onCancelEdit={editing ? () => setEditing(null) : undefined}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Asset register
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Lifecycle: <strong>Purchase</strong> (on registration),{" "}
          <strong>Transfer</strong>, <strong>Maintenance</strong>,{" "}
          <strong>Disposal</strong>. Depreciation is manual via current value.
        </p>
        <AssetList
          assets={initialAssets}
          offices={offices}
          onEdit={(row) => setEditing(listRowToAsset(row))}
        />
      </section>
    </div>
  );
}
