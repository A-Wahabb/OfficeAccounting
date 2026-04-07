"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { deactivateOfficeAction } from "@/app/actions/offices";
import type { Office } from "@/types/office";

type OfficeTableProps = {
  offices: Office[];
  onEdit: (office: Office) => void;
};

export function OfficeTable({ offices, onEdit }: OfficeTableProps) {
  const router = useRouter();

  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateOfficeAction(id),
    onSuccess: (result) => {
      if (result.ok) {
        router.refresh();
      }
    },
  });

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-lg font-medium text-neutral-900 dark:text-neutral-50">
          Offices
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Deactivate sets status to inactive (no delete).
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            <tr>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Head</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {offices.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-neutral-500"
                >
                  No offices yet. Create one above.
                </td>
              </tr>
            ) : (
              offices.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2 font-mono text-neutral-900 dark:text-neutral-100">
                    {o.code}
                  </td>
                  <td className="px-4 py-2 text-neutral-800 dark:text-neutral-200">
                    {o.name}
                  </td>
                  <td className="px-4 py-2">
                    {o.is_head_office ? (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                        Head
                      </span>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        o.status === "active"
                          ? "text-green-700 dark:text-green-400"
                          : "text-neutral-500"
                      }
                    >
                      {o.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(o)}
                        className="text-sm font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
                      >
                        Edit
                      </button>
                      {o.status === "active" && (
                        <button
                          type="button"
                          disabled={deactivate.isPending}
                          onClick={() => {
                            if (
                              confirm(
                                `Deactivate office “${o.name}”? It will be marked inactive.`,
                              )
                            ) {
                              deactivate.mutate(o.id);
                            }
                          }}
                          className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50 dark:text-red-400"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {deactivate.data && !deactivate.data.ok && deactivate.data.error && (
        <p className="border-t border-neutral-200 px-4 py-2 text-sm text-red-600 dark:border-neutral-800">
          {deactivate.data.error}
        </p>
      )}
    </div>
  );
}
