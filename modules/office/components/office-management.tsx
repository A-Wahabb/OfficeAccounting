"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Office } from "@/types/office";

import { OfficeForm } from "./office-form";
import { OfficeTable } from "./office-table";

type OfficeManagementProps = {
  initialOffices: Office[];
};

export function OfficeManagement({ initialOffices }: OfficeManagementProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Office | null>(null);

  const handleSuccess = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <OfficeForm
        mode={editing ? "edit" : "create"}
        office={editing}
        onSuccess={handleSuccess}
        onCancelEdit={editing ? () => setEditing(null) : undefined}
      />
      <OfficeTable offices={initialOffices} onEdit={setEditing} />
    </div>
  );
}
