"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { submitContact } from "@/app/actions/contact";
import { contactSchema, type ContactInput } from "@/validators/contact";

export function ContactForm() {
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  const mutation = useMutation({
    mutationFn: submitContact,
    onSuccess: (result) => {
      if (result.ok) {
        form.reset();
      } else if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([key, messages]) => {
          const msg = messages?.[0];
          if (msg) {
            form.setError(key as keyof ContactInput, { message: msg });
          }
        });
      }
    },
  });

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <h2 className="mb-4 text-lg font-medium text-neutral-900 dark:text-neutral-50">
        Server action + RHF + Zod + TanStack Query
      </h2>
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        noValidate
      >
        <div className="space-y-1">
          <label
            htmlFor="name"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Name
          </label>
          <input
            id="name"
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
            htmlFor="email"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-red-600">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label
            htmlFor="message"
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            Message
          </label>
          <textarea
            id="message"
            rows={4}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
            {...form.register("message")}
          />
          {form.formState.errors.message && (
            <p className="text-xs text-red-600">
              {form.formState.errors.message.message}
            </p>
          )}
        </div>
        {mutation.isError && (
          <p className="text-sm text-red-600">Something went wrong.</p>
        )}
        {mutation.data && !mutation.data.ok && mutation.data.error && (
          <p className="text-sm text-red-600">{mutation.data.error}</p>
        )}
        {mutation.isSuccess && mutation.data?.ok && (
          <p className="text-sm text-green-700 dark:text-green-400">
            Thanks — message received.
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          {mutation.isPending ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}
