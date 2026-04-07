"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Account, AccountWithBalance } from "@/types/account";
import type { Office } from "@/types/office";

import { AccountForm } from "./account-form";
import { AccountTable } from "./account-table";

type AccountManagementProps = {
  initialAccounts: AccountWithBalance[];
  offices: Pick<Office, "id" | "name" | "code">[];
};

export function AccountManagement({
  initialAccounts,
  offices,
}: AccountManagementProps) {
  const router = useRouter();
  const [editing, setEditing] = useState<Account | null>(null);

  const handleSuccess = () => {
    setEditing(null);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <AccountForm
        mode={editing ? "edit" : "create"}
        account={editing}
        offices={offices}
        onSuccess={handleSuccess}
        onCancelEdit={editing ? () => setEditing(null) : undefined}
      />
      <AccountTable
        accounts={initialAccounts}
        onEdit={(row) => {
          const { balance_total: _bt, ...acc } = row;
          void _bt;
          setEditing(acc);
        }}
      />
    </div>
  );
}
