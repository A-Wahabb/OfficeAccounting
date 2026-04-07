import Link from "next/link";

import { ROUTES } from "@/lib/constants/routes";
import { AssetManagement } from "@/modules/assets";
import { listAssetsWithOffices } from "@/services/asset";
import { listOffices } from "@/services/office";

export default async function AssetsPage() {
  const [assets, offices] = await Promise.all([
    listAssetsWithOffices(),
    listOffices(),
  ]);

  const activeOffices = offices.filter((o) => o.status === "active");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={ROUTES.dashboard}
          className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Asset management
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Register equipment, computers, and property. Track lifecycle events and adjust{" "}
          <strong>current value</strong> manually for depreciation.
        </p>
      </div>

      {activeOffices.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          No active offices. Create or activate an office before registering assets.
        </p>
      ) : (
        <AssetManagement initialAssets={assets} offices={activeOffices} />
      )}
    </div>
  );
}
