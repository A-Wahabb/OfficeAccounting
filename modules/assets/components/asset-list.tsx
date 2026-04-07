"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";

import {
  disposeAssetAction,
  listAssetEventsAction,
  maintenanceAssetAction,
  transferAssetAction,
} from "@/app/actions/assets";
import type { AssetLifecycleEvent, AssetListRow } from "@/types/asset";
import type { Office } from "@/types/office";

type AssetListProps = {
  assets: AssetListRow[];
  offices: Pick<Office, "id" | "name" | "code">[];
  onEdit?: (row: AssetListRow) => void;
};

export function AssetList({ assets, offices, onEdit }: AssetListProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [eventsByAsset, setEventsByAsset] = useState<
    Record<string, AssetLifecycleEvent[]>
  >({});
  const [loadingEvents, setLoadingEvents] = useState<string | null>(null);

  const toggleHistory = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (eventsByAsset[id]) {
      return;
    }
    setLoadingEvents(id);
    const res = await listAssetEventsAction(id);
    setLoadingEvents(null);
    if (res.ok) {
      setEventsByAsset((prev) => ({ ...prev, [id]: res.events }));
    }
  };

  if (assets.length === 0) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        No assets yet. Register a purchase above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50">
            <tr>
              <th className="px-3 py-2 font-medium">Code</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Office</th>
              <th className="px-3 py-2 font-medium">Purchased</th>
              <th className="px-3 py-2 text-right font-medium">Purchase</th>
              <th className="px-3 py-2 text-right font-medium">Current</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Lifecycle</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <Fragment key={a.id}>
                <tr className="border-t border-neutral-200 dark:border-neutral-700">
                  <td className="px-3 py-2 font-mono text-xs">{a.asset_code}</td>
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2">{a.asset_kind}</td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-400">
                    {a.office_code}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {a.purchase_date ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {a.purchase_value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {a.current_value.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-3 py-2">
                    {a.disposed_at ? (
                      <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs dark:bg-neutral-700">
                        Disposed {a.disposed_at}
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      {onEdit && !a.disposed_at && (
                        <button
                          type="button"
                          className="text-left text-xs text-neutral-800 underline-offset-2 hover:underline dark:text-neutral-200"
                          onClick={() => onEdit(a)}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-left text-xs text-blue-700 underline-offset-2 hover:underline dark:text-blue-400"
                        onClick={() => void toggleHistory(a.id)}
                      >
                        {expandedId === a.id ? "Hide history" : "History"}
                      </button>
                      {!a.disposed_at && (
                        <LifecycleActions
                          asset={a}
                          offices={offices}
                          onDone={() => router.refresh()}
                        />
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === a.id && (
                  <tr className="bg-neutral-50/80 dark:bg-neutral-900/30">
                    <td colSpan={9} className="px-3 py-3">
                      {loadingEvents === a.id && (
                        <p className="text-xs text-neutral-500">Loading…</p>
                      )}
                      {eventsByAsset[a.id] && (
                        <ul className="space-y-2 text-xs">
                          {eventsByAsset[a.id]!.map((e) => (
                            <li
                              key={e.id}
                              className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2 last:border-0 dark:border-neutral-700"
                            >
                              <span className="font-medium">{e.kind}</span>
                              <span className="text-neutral-500">
                                {new Date(e.occurred_at).toLocaleString()}
                              </span>
                              {e.notes && (
                                <span className="text-neutral-700 dark:text-neutral-300">
                                  — {e.notes}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LifecycleActions({
  asset,
  offices,
  onDone,
}: {
  asset: AssetListRow;
  offices: Pick<Office, "id" | "name" | "code">[];
  onDone: () => void;
}) {
  const [transferTo, setTransferTo] = useState("");
  const [maintNotes, setMaintNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const transferMut = useMutation({
    mutationFn: () =>
      transferAssetAction(asset.id, transferTo, null),
    onSuccess: (r) => {
      if (r.ok) {
        setErr(null);
        setTransferTo("");
        onDone();
      } else {
        setErr(r.error);
      }
    },
  });

  const maintMut = useMutation({
    mutationFn: () => maintenanceAssetAction(asset.id, maintNotes),
    onSuccess: (r) => {
      if (r.ok) {
        setErr(null);
        setMaintNotes("");
        onDone();
      } else {
        setErr(r.error);
      }
    },
  });

  const disposeMut = useMutation({
    mutationFn: () => disposeAssetAction(asset.id, null),
    onSuccess: (r) => {
      if (r.ok) {
        setErr(null);
        onDone();
      } else {
        setErr(r.error);
      }
    },
  });

  const otherOffices = offices.filter((o) => o.id !== asset.office_id);

  return (
    <div className="flex min-w-[12rem] flex-col gap-2 border-l border-neutral-200 pl-2 dark:border-neutral-700">
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex flex-wrap items-center gap-1">
        <select
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
          className="max-w-[10rem] rounded border border-neutral-300 px-1 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-900"
        >
          <option value="">Transfer to…</option>
          {otherOffices.map((o) => (
            <option key={o.id} value={o.id}>
              {o.code}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!transferTo || transferMut.isPending}
          onClick={() => transferMut.mutate()}
          className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-white disabled:opacity-50 dark:bg-neutral-200 dark:text-neutral-900"
        >
          Go
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-1">
        <input
          placeholder="Maintenance notes"
          value={maintNotes}
          onChange={(e) => setMaintNotes(e.target.value)}
          className="min-w-[8rem] flex-1 rounded border border-neutral-300 px-2 py-0.5 text-xs dark:border-neutral-600 dark:bg-neutral-900"
        />
        <button
          type="button"
          disabled={maintMut.isPending || !maintNotes.trim()}
          onClick={() => maintMut.mutate()}
          className="rounded border border-neutral-400 px-2 py-0.5 text-xs dark:border-neutral-500"
        >
          Log
        </button>
      </div>
      <button
        type="button"
        disabled={disposeMut.isPending}
        onClick={() => {
          if (
            typeof window !== "undefined" &&
            !window.confirm("Mark this asset as disposed?")
          ) {
            return;
          }
          disposeMut.mutate();
        }}
        className="w-fit text-xs text-red-700 underline-offset-2 hover:underline dark:text-red-400"
      >
        Dispose
      </button>
    </div>
  );
}
