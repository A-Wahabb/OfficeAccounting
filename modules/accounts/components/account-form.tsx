"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  createAccountAction,
  updateAccountAction,
} from "@/app/actions/accounts";
import type { Account } from "@/types/account";
import type { Office } from "@/types/office";
import {
  ACCOUNT_TYPES,
  accountFormClientSchema,
  type AccountFormInputValues,
  type AccountFormValues,
} from "@/validators/account";

type AccountFormProps = {
  mode: "create" | "edit";
  account: Account | null;
  offices: Pick<Office, "id" | "name" | "code">[];
  onSuccess?: () => void;
  onCancelEdit?: () => void;
};

export function AccountForm({
  mode,
  account,
  offices,
  onSuccess,
  onCancelEdit,
}: AccountFormProps) {
  const form = useForm<AccountFormInputValues>({
    resolver: zodResolver(accountFormClientSchema),
    defaultValues: {
      code: "",
      name: "",
      account_type: "ASSET",
      office_id: "",
      currency: "PKR",
      is_active: true,
      opening_balance: 0,
    },
  });

  const officeScope = form.watch("office_id");
  const accountType = form.watch("account_type");
  const isCashOrBank = accountType === "CASH" || accountType === "BANK";

  useEffect(() => {
    if (mode === "edit" && account) {
      form.reset({
        code: account.code,
        name: account.name,
        account_type: account.account_type,
        office_id: account.office_id ?? "",
        currency: account.currency,
        is_active: account.is_active,
        opening_balance: 0,
      });
    }
    if (mode === "create") {
      form.reset({
        code: "",
        name: "",
        account_type: "ASSET",
        office_id: "",
        currency: "PKR",
        is_active: true,
        opening_balance: 0,
      });
    }
  }, [mode, account, form]);

  const mutation = useMutation({
    mutationFn: async (data: AccountFormValues) => {
      if (mode === "create") {
        return createAccountAction(data);
      }
      if (!account) {
        return { ok: false as const, error: "No account selected" };
      }
      return updateAccountAction(account.id, data);
    },
    onSuccess: (result) => {
      if (result.ok) {
        onSuccess?.();
        if (mode === "create") {
          form.reset({
            code: "",
            name: "",
            account_type: "ASSET",
            office_id: "",
            currency: "PKR",
            is_active: true,
            opening_balance: 0,
          });
        }
      } else if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          const msg = messages?.[0];
          if (msg) {
            form.setError(key as keyof AccountFormInputValues, { message: msg });
          }
        });
      }
    },
  });

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
          {mode === "create" ? "Create account" : "Edit account"}
        </h2>
        {mode === "edit" && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Cancel edit
          </button>
        )}
      </div>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data) =>
          mutation.mutate(data as AccountFormValues),
        )}
        noValidate
      >
        <div className="space-y-1">
          <label
            htmlFor="acc-code"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Code
          </label>
          <input
            id="acc-code"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            {...form.register("code")}
            disabled={mode === "edit"}
          />
          {mode === "edit" && (
            <p className="text-xs text-neutral-500">Code cannot be changed.</p>
          )}
          {form.formState.errors.code && (
            <p className="text-xs text-red-600">
              {form.formState.errors.code.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label
            htmlFor="acc-name"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Name
          </label>
          <input
            id="acc-name"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="text-xs text-red-600">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label
            htmlFor="acc-type"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Account type
          </label>
          <select
            id="acc-type"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            {...form.register("account_type")}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {form.formState.errors.account_type && (
            <p className="text-xs text-red-600">
              {form.formState.errors.account_type.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label
            htmlFor="acc-office"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Office scope
          </label>
          <select
            id="acc-office"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            {...form.register("office_id")}
          >
            <option value="">Shared (all offices)</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-500">
            Leave shared for a global chart line; otherwise the account applies
            only to that office.
          </p>
          {form.formState.errors.office_id && (
            <p className="text-xs text-red-600">
              {form.formState.errors.office_id.message}
            </p>
          )}
        </div>
        {mode === "create" && (
          <div className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Opening balance
            </p>
            {isCashOrBank ? (
              <>
                <div className="space-y-1">
                  <label
                    htmlFor="acc-opening"
                    className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
                  >
                    Amount (optional)
                  </label>
                  <input
                    id="acc-opening"
                    type="number"
                    step="0.01"
                    className="w-full max-w-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
                    {...form.register("opening_balance", { valueAsNumber: true })}
                  />
                  {form.formState.errors.opening_balance && (
                    <p className="text-xs text-red-600">
                      {form.formState.errors.opening_balance.message}
                    </p>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  One simple base amount for this account ({officeScope === "" ? "shared" : "office-specific"}).
                  Running balance = opening balance + posted transactions.
                </p>
              </>
            ) : (
              <p className="text-xs text-neutral-500">
                Opening balance is used for CASH/BANK accounts. For other types, create transactions
                to build the balance.
              </p>
            )}
          </div>
        )}
        <div className="space-y-1">
          <label
            htmlFor="acc-currency"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Currency
          </label>
          <input
            id="acc-currency"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            {...form.register("currency")}
          />
          {form.formState.errors.currency && (
            <p className="text-xs text-red-600">
              {form.formState.errors.currency.message}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Controller
            name="is_active"
            control={form.control}
            render={({ field: { value, onChange, ref } }) => (
              <input
                id="acc-active"
                type="checkbox"
                ref={ref}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
            )}
          />
          <label
            htmlFor="acc-active"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Active
          </label>
        </div>
        {mutation.data && !mutation.data.ok && mutation.data.error && (
          <p className="text-sm text-red-600">{mutation.data.error}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending || (mode === "edit" && !account)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {mutation.isPending
            ? "Saving…"
            : mode === "create"
              ? "Create account"
              : "Save changes"}
        </button>
      </form>
    </section>
  );
}
