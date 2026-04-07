"use client";

import { useRouter } from "next/navigation";

import type { CashClosingListRow } from "@/types/cash-closing";
import type { Office } from "@/types/office";

import { CashClosingForm } from "./cash-closing-form";
import { CashClosingList } from "./cash-closing-list";

type CashClosingManagementProps = {
  initialRows: CashClosingListRow[];
  offices: Pick<Office, "id" | "name" | "code">[];
  currentUserId: string;
};

export function CashClosingManagement({
  initialRows,
  offices,
  currentUserId,
}: CashClosingManagementProps) {
  const router = useRouter();

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          New closing
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          One closing per office per calendar day is enforced in the database (
          <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
            UNIQUE (office_id, closing_date)
          </code>
          ). Duplicate attempts return a clear error.
        </p>
        <CashClosingForm
          offices={offices}
          onSuccess={() => router.refresh()}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          History
        </h2>
        <CashClosingList rows={initialRows} currentUserId={currentUserId} />
      </section>
    </div>
  );
}
