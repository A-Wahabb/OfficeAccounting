import Link from "next/link";

import { requireRole } from "@/lib/auth/guards";
import { ROUTES } from "@/lib/constants/routes";
import { OfficeManagement } from "@/modules/office";
import { listOffices } from "@/services/office";

export default async function OfficesPage() {
  await requireRole(["ADMIN"]);

  const offices = await listOffices();

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
          Office management
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Create and manage offices. Only one head office is allowed; assigning
          a new head clears the flag on the previous head.
        </p>
      </div>
      <OfficeManagement initialOffices={offices} />
    </div>
  );
}
