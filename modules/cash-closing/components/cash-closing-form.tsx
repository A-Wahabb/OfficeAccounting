"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { createCashClosingAction } from "@/app/actions/cash-closings";
import type { Office } from "@/types/office";
import {
  cashClosingFormSchema,
  type CashClosingFormValues,
} from "@/validators/cash-closing";

type CashClosingFormProps = {
  offices: Pick<Office, "id" | "name" | "code">[];
  onSuccess?: () => void;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CashClosingForm({ offices, onSuccess }: CashClosingFormProps) {
  const form = useForm<CashClosingFormValues>({
    resolver: zodResolver(cashClosingFormSchema),
    defaultValues: {
      office_id: offices[0]?.id ?? "",
      closing_date: todayIsoDate(),
      opening_balance: 0,
      closing_balance: 0,
    },
  });

  const opening = useWatch({ control: form.control, name: "opening_balance" });
  const closing = useWatch({ control: form.control, name: "closing_balance" });
  const difference = useMemo(
    () => (Number(closing) || 0) - (Number(opening) || 0),
    [opening, closing],
  );

  const [actionError, setActionError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CashClosingFormValues) => createCashClosingAction(data),
    onSuccess: (result) => {
      if (result.ok) {
        setActionError(null);
        onSuccess?.();
        form.reset({
          office_id: form.getValues("office_id"),
          closing_date: todayIsoDate(),
          opening_balance: 0,
          closing_balance: 0,
        });
        return;
      }
      if (result.fieldErrors) {
        setActionError(null);
        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          const msg = messages?.[0];
          if (msg) {
            form.setError(key as keyof CashClosingFormValues, { message: msg });
          }
        });
        return;
      }
      setActionError(result.error);
    },
  });

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
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Closing date
          </label>
          <input
            type="date"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("closing_date")}
          />
          {form.formState.errors.closing_date && (
            <p className="text-sm text-red-600">
              {form.formState.errors.closing_date.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Opening balance
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("opening_balance", { valueAsNumber: true })}
          />
          {form.formState.errors.opening_balance && (
            <p className="text-sm text-red-600">
              {form.formState.errors.opening_balance.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Closing balance
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            {...form.register("closing_balance", { valueAsNumber: true })}
          />
          {form.formState.errors.closing_balance && (
            <p className="text-sm text-red-600">
              {form.formState.errors.closing_balance.message}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900/40">
        <span className="text-neutral-600 dark:text-neutral-400">Difference </span>
        <span className="font-mono font-medium tabular-nums text-neutral-900 dark:text-neutral-100">
          {difference.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
        <span className="ml-2 text-xs text-neutral-500">
          (closing − opening; stored on save)
        </span>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        {mutation.isPending ? "Saving…" : "Record closing"}
      </button>
    </form>
  );
}
