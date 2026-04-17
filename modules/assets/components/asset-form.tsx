"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  createAssetAction,
  updateAssetAction,
} from "@/app/actions/assets";
import { listAccountsForOfficeAction } from "@/app/actions/transactions";
import { ASSET_KINDS, type Asset, type AssetKind } from "@/types/asset";
import type { Account } from "@/types/account";
import type { Office } from "@/types/office";
import { assetFormClientSchema, type AssetFormValues } from "@/validators/asset";

const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  EQUIPMENT: "Equipment",
  COMPUTER: "Computer",
  PROPERTY: "Property",
  CASH: "Cash (ledger)",
  BANK: "Bank (ledger)",
};

type AssetFormProps = {
  mode: "create" | "edit";
  asset: Asset | null;
  offices: Pick<Office, "id" | "name" | "code">[];
  onSuccess?: () => void;
  onCancelEdit?: () => void;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AssetForm({
  mode,
  asset,
  offices,
  onSuccess,
  onCancelEdit,
}: AssetFormProps) {
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormClientSchema),
    defaultValues: {
      name: "",
      asset_kind: "EQUIPMENT",
      office_id: offices[0]?.id ?? "",
      purchase_date: todayIsoDate(),
      purchase_value: 0,
      current_value: 0,
      account_id: "",
      opening_balance: 0,
    },
  });

  const assetKind = form.watch("asset_kind");
  const officeId = form.watch("office_id");
  const isCashBank = assetKind === "CASH" || assetKind === "BANK";
  const [cashBankAccounts, setCashBankAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (mode === "edit" && asset) {
      form.reset({
        name: asset.name,
        asset_kind: asset.asset_kind,
        office_id: asset.office_id,
        purchase_date: asset.purchase_date ?? "",
        purchase_value: asset.purchase_value,
        current_value: asset.current_value,
        account_id: asset.account_id ?? "",
        opening_balance: 0,
      });
    }
    if (mode === "create") {
      form.reset({
        name: "",
        asset_kind: "EQUIPMENT",
        office_id: offices[0]?.id ?? "",
        purchase_date: todayIsoDate(),
        purchase_value: 0,
        current_value: 0,
        account_id: "",
        opening_balance: 0,
      });
    }
  }, [mode, asset, offices, form]);

  useEffect(() => {
    if (!isCashBank || !officeId) {
      setCashBankAccounts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await listAccountsForOfficeAction(officeId);
      if (!cancelled && res.ok) {
        setCashBankAccounts(
          res.accounts.filter(
            (a) =>
              a.is_active &&
              (a.account_type === "CASH" || a.account_type === "BANK"),
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCashBank, officeId]);

  useEffect(() => {
    if (!isCashBank) {
      form.setValue("account_id", "");
      form.setValue("opening_balance", 0);
    }
  }, [isCashBank, form]);

  const [actionError, setActionError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: AssetFormValues) => {
      if (mode === "create") {
        return createAssetAction(data);
      }
      if (!asset) {
        return { ok: false as const, error: "No asset selected" };
      }
      return updateAssetAction(asset.id, data);
    },
    onSuccess: (result) => {
      if (result.ok) {
        setActionError(null);
        onSuccess?.();
        if (mode === "create") {
          form.reset({
            name: "",
            asset_kind: "EQUIPMENT",
            office_id: form.getValues("office_id"),
            purchase_date: todayIsoDate(),
            purchase_value: 0,
            current_value: 0,
            account_id: "",
            opening_balance: 0,
          });
        }
        return;
      }
      if (result.fieldErrors) {
        setActionError(null);
        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          const msg = messages?.[0];
          if (msg) {
            form.setError(key as keyof AssetFormValues, { message: msg });
          }
        });
        return;
      }
      setActionError(result.error);
    },
  });

  const isDisposed = mode === "edit" && asset?.disposed_at;

  if (isDisposed) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        This asset is disposed. Details are read-only in the list; editing is disabled.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((data) => {
        setActionError(null);
        mutation.mutate(data);
      })}
    >
      {actionError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {actionError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Name
          </label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Type
          </label>
          <Controller
            name="asset_kind"
            control={form.control}
            render={({ field }) => (
              <select
                {...field}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                {ASSET_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ASSET_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Office
          </label>
          <Controller
            name="office_id"
            control={form.control}
            render={({ field }) => (
              <select
                {...field}
                disabled={mode === "edit"}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-70 dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="">Select office</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} — {o.name}
                  </option>
                ))}
              </select>
            )}
          />
          {form.formState.errors.office_id && (
            <p className="text-sm text-red-600">
              {form.formState.errors.office_id.message}
            </p>
          )}
          {mode === "edit" && (
            <p className="text-xs text-neutral-500">
              Transfer this asset from the list (lifecycle).
            </p>
          )}
        </div>

        {isCashBank && (
          <>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Ledger account
              </label>
              <Controller
                name="account_id"
                control={form.control}
                render={({ field }) => (
                  <select
                    {...field}
                    disabled={mode === "edit"}
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm disabled:opacity-70 dark:border-neutral-600 dark:bg-neutral-900"
                  >
                    <option value="">Select CASH or BANK account</option>
                    {mode === "edit" &&
                      field.value &&
                      !cashBankAccounts.some((a) => a.id === field.value) && (
                        <option value={field.value}>
                          Linked account (see Chart of Accounts for details)
                        </option>
                      )}
                    {cashBankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name} ({a.account_type})
                      </option>
                    ))}
                  </select>
                )}
              />
              {form.formState.errors.account_id && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.account_id.message}
                </p>
              )}
              {cashBankAccounts.length === 0 && officeId && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  No active CASH/BANK accounts for this office. Add one under Chart of Accounts first.
                </p>
              )}
              {mode === "edit" && (
                <p className="text-xs text-neutral-500">
                  Linked account cannot be changed here. Opening balance was applied at registration only.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Opening balance
              </label>
              {mode === "edit" ? (
                <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                  Applied when this asset was registered. Adjust balances via transactions or Chart of
                  Accounts.
                </p>
              ) : (
                <>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                    {...form.register("opening_balance", { valueAsNumber: true })}
                  />
                  {form.formState.errors.opening_balance && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.opening_balance.message}
                    </p>
                  )}
                  <p className="text-xs text-neutral-500">
                    Sets the initial ledger balance for this account at this office (only when the
                    account has no existing balance for this office, or the balance is zero).
                  </p>
                </>
              )}
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Purchase date
          </label>
          <input
            type="date"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("purchase_date")}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Purchase value
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("purchase_value", { valueAsNumber: true })}
          />
          {form.formState.errors.purchase_value && (
            <p className="text-sm text-red-600">
              {form.formState.errors.purchase_value.message}
            </p>
          )}
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Current value (manual depreciation)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full max-w-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("current_value", { valueAsNumber: true })}
          />
          {form.formState.errors.current_value && (
            <p className="text-sm text-red-600">
              {form.formState.errors.current_value.message}
            </p>
          )}
          <p className="text-xs text-neutral-500">
            Depreciation is manual only — update this field when you adjust carrying value.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {mutation.isPending
            ? "Saving…"
            : mode === "create"
              ? "Register purchase"
              : "Save changes"}
        </button>
        {mode === "edit" && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-600"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
