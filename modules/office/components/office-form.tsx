"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  createOfficeAction,
  updateOfficeAction,
} from "@/app/actions/offices";
import type { Office } from "@/types/office";
import {
  officeFormSchema,
  type OfficeFormInput,
} from "@/validators/office";

type OfficeFormProps = {
  mode: "create" | "edit";
  office: Office | null;
  onSuccess?: () => void;
  onCancelEdit?: () => void;
};

export function OfficeForm({
  mode,
  office,
  onSuccess,
  onCancelEdit,
}: OfficeFormProps) {
  const form = useForm<OfficeFormInput>({
    resolver: zodResolver(officeFormSchema),
    defaultValues: {
      name: "",
      code: "",
      is_head_office: false,
      status: "active",
    },
  });

  useEffect(() => {
    if (mode === "edit" && office) {
      form.reset({
        name: office.name,
        code: office.code,
        is_head_office: office.is_head_office,
        status: office.status,
      });
    }
    if (mode === "create") {
      form.reset({
        name: "",
        code: "",
        is_head_office: false,
        status: "active",
      });
    }
  }, [mode, office, form]);

  const mutation = useMutation({
    mutationFn: async (data: OfficeFormInput) => {
      if (mode === "create") {
        return createOfficeAction(data);
      }
      if (!office) {
        return { ok: false as const, error: "No office selected" };
      }
      return updateOfficeAction(office.id, data);
    },
    onSuccess: (result) => {
      if (result.ok) {
        onSuccess?.();
        if (mode === "create") {
          form.reset({
            name: "",
            code: "",
            is_head_office: false,
            status: "active",
          });
        }
      } else if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          const msg = messages?.[0];
          if (msg) {
            form.setError(key as keyof OfficeFormInput, { message: msg });
          }
        });
      }
    },
  });

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
          {mode === "create" ? "Create office" : "Edit office"}
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
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        noValidate
      >
        <div className="space-y-1">
          <label
            htmlFor="office-name"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Name
          </label>
          <input
            id="office-name"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
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
            htmlFor="office-code"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Code
          </label>
          <input
            id="office-code"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
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
        <div className="flex items-center gap-2">
          <Controller
            name="is_head_office"
            control={form.control}
            render={({ field: { value, onChange, ref } }) => (
              <input
                id="office-head"
                type="checkbox"
                ref={ref}
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
            )}
          />
          <label
            htmlFor="office-head"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Head office (only one allowed system-wide)
          </label>
        </div>
        {form.formState.errors.is_head_office && (
          <p className="text-xs text-red-600">
            {form.formState.errors.is_head_office.message}
          </p>
        )}
        <div className="space-y-1">
          <label
            htmlFor="office-status"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Status
          </label>
          <select
            id="office-status"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            {...form.register("status")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {form.formState.errors.status && (
            <p className="text-xs text-red-600">
              {form.formState.errors.status.message}
            </p>
          )}
        </div>
        {mutation.isError && (
          <p className="text-sm text-red-600">Something went wrong.</p>
        )}
        {mutation.data && !mutation.data.ok && mutation.data.error && (
          <p className="text-sm text-red-600">{mutation.data.error}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending || (mode === "edit" && !office)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {mutation.isPending
            ? "Saving…"
            : mode === "create"
              ? "Create office"
              : "Save changes"}
        </button>
      </form>
    </section>
  );
}
