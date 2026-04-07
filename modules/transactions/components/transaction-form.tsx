"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { createTransactionAction, listAccountsForOfficeAction } from "@/app/actions/transactions";
import { ROUTES } from "@/lib/constants/routes";
import type { Account } from "@/types/account";
import type { Office } from "@/types/office";
import {
  TRANSACTION_TYPES_CREATE,
  transactionFormClientSchema,
  type TransactionFormValues,
} from "@/validators/transaction";

type TransactionFormProps = {
  offices: Pick<Office, "id" | "name" | "code">[];
  onSuccess?: () => void;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionForm({ offices, onSuccess }: TransactionFormProps) {
  const router = useRouter();
  const defaultOfficeId = offices[0]?.id ?? "";
  const [entryMode, setEntryMode] = useState<"simple" | "advanced">("simple");
  const [simpleDebitAccountId, setSimpleDebitAccountId] = useState("");
  const [simpleCreditAccountId, setSimpleCreditAccountId] = useState("");
  const [simpleAmount, setSimpleAmount] = useState<number>(0);
  const [simpleMemo, setSimpleMemo] = useState("");
  const [simpleError, setSimpleError] = useState<string | null>(null);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormClientSchema),
    defaultValues: {
      office_id: defaultOfficeId,
      type: "PAYMENT",
      currency: "PKR",
      description: "",
      transaction_date: todayIsoDate(),
      items: [
        { account_id: "", debit: 0, credit: 0, description: "" },
        { account_id: "", debit: 0, credit: 0, description: "" },
      ],
    },
  });

  const officeId = form.watch("office_id");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (!officeId) {
      setAccounts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await listAccountsForOfficeAction(officeId);
      if (!cancelled && res.ok) {
        setAccounts(res.accounts);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [officeId]);

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: `${a.code} — ${a.name}`,
      })),
    [accounts],
  );

  const mutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => createTransactionAction(data),
    onSuccess: (result) => {
      if (result.ok) {
        setActionError(null);
        setSimpleError(null);
        onSuccess?.();
        router.push(`${ROUTES.dashboardTransactions}?created=1`);
        return;
      }
      if (result.fieldErrors) {
        setActionError(null);
        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          const msg = messages?.[0];
          if (msg) {
            form.setError(key as keyof TransactionFormValues, { message: msg });
          }
        });
        return;
      }
      setActionError(result.error);
    },
  });

  const submitSimple = () => {
    const header = form.getValues();
    const amount = Number(simpleAmount);

    if (!simpleDebitAccountId || !simpleCreditAccountId) {
      setSimpleError("Select both debit and credit accounts.");
      return;
    }
    if (simpleDebitAccountId === simpleCreditAccountId) {
      setSimpleError("Debit and credit accounts must be different.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setSimpleError("Amount must be greater than zero.");
      return;
    }

    setSimpleError(null);
    const payload: TransactionFormValues = {
      office_id: header.office_id,
      type: header.type,
      currency: header.currency,
      description: header.description,
      transaction_date: header.transaction_date,
      items: [
        {
          account_id: simpleDebitAccountId,
          debit: amount,
          credit: 0,
          description: simpleMemo,
        },
        {
          account_id: simpleCreditAccountId,
          debit: 0,
          credit: amount,
          description: simpleMemo,
        },
      ],
    };
    mutation.mutate(payload);
  };

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
      {actionError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {actionError}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="" disabled>
                  Select office
                </option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} — {o.name}
                  </option>
                ))}
              </select>
            )}
          />
          {form.formState.errors.office_id && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.office_id.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Type
          </label>
          <Controller
            name="type"
            control={form.control}
            render={({ field }) => (
              <select
                {...field}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                {TRANSACTION_TYPES_CREATE.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Date
          </label>
          <input
            type="date"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("transaction_date")}
          />
          {form.formState.errors.transaction_date && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.transaction_date.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Currency
          </label>
          <input
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("currency")}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            entryMode === "simple"
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
              : "border-neutral-300 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
          onClick={() => setEntryMode("simple")}
        >
          Simple
        </button>
        <button
          type="button"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            entryMode === "advanced"
              ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
              : "border-neutral-300 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          }`}
          onClick={() => setEntryMode("advanced")}
        >
          Advanced
        </button>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Description (optional)
        </label>
        <textarea
          rows={2}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
          {...form.register("description")}
        />
      </div>

      {entryMode === "simple" ? (
        <div className="space-y-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Simple entry
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Debit account
              </label>
              <select
                value={simpleDebitAccountId}
                onChange={(e) => setSimpleDebitAccountId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="">Select account</option>
                {accountOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Credit account
              </label>
              <select
                value={simpleCreditAccountId}
                onChange={(e) => setSimpleCreditAccountId(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              >
                <option value="">Select account</option>
                {accountOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={simpleAmount}
                onChange={(e) => setSimpleAmount(e.target.valueAsNumber || 0)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Memo (optional)
              </label>
              <input
                value={simpleMemo}
                onChange={(e) => setSimpleMemo(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
              />
            </div>
          </div>
          {simpleError && <p className="text-sm text-red-600">{simpleError}</p>}
        </div>
      ) : (
        <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Lines (double entry)
          </h3>
          <button
            type="button"
            className="text-sm text-neutral-600 underline-offset-4 hover:underline dark:text-neutral-400"
            onClick={() =>
              append({ account_id: "", debit: 0, credit: 0, description: "" })
            }
          >
            Add line
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50">
              <tr>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Debit</th>
                <th className="px-3 py-2 font-medium">Credit</th>
                <th className="px-3 py-2 font-medium">Memo</th>
                <th className="w-10 px-2" />
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id} className="border-t border-neutral-200 dark:border-neutral-700">
                  <td className="px-3 py-2 align-top">
                    <Controller
                      name={`items.${index}.account_id`}
                      control={form.control}
                      render={({ field: f }) => (
                        <select
                          {...f}
                          className="w-full min-w-[12rem] rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                        >
                          <option value="">Select account</option>
                          {accountOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {form.formState.errors.items?.[index]?.account_id && (
                      <p className="mt-1 text-xs text-red-600">
                        {form.formState.errors.items[index]?.account_id?.message}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-28 rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                      {...form.register(`items.${index}.debit`, {
                        valueAsNumber: true,
                      })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-28 rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                      {...form.register(`items.${index}.credit`, {
                        valueAsNumber: true,
                      })}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      className="w-full min-w-[8rem] rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
                      {...form.register(`items.${index}.description`)}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    {fields.length > 2 && (
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => remove(index)}
                      >
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {form.formState.errors.items?.root && (
          <p className="text-sm text-red-600">
            {form.formState.errors.items.root.message}
          </p>
        )}
        {form.formState.errors.items && !Array.isArray(form.formState.errors.items) && (
          <p className="text-sm text-red-600">
            {(form.formState.errors.items as { message?: string }).message}
          </p>
        )}
      </div>
      )}

      <button
        type="button"
        onClick={
          entryMode === "simple"
            ? submitSimple
            : form.handleSubmit((data) => mutation.mutate(data))
        }
        disabled={mutation.isPending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        {mutation.isPending ? "Saving…" : "Create transaction"}
      </button>
    </form>
  );
}
