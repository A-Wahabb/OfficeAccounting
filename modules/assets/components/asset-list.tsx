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
                    <LifecycleActions
                      asset={a}
                      offices={offices}
                      onEdit={onEdit}
                      historyOpen={expandedId === a.id}
                      onToggleHistory={() => void toggleHistory(a.id)}
                      onDone={() => router.refresh()}
                    />
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
  onEdit,
  historyOpen,
  onToggleHistory,
  onDone,
}: {
  asset: AssetListRow;
  offices: Pick<Office, "id" | "name" | "code">[];
  onEdit?: (row: AssetListRow) => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
  onDone: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"transfer" | "maintenance" | "dispose" | null>(
    null,
  );
  const [transferTo, setTransferTo] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [maintNotes, setMaintNotes] = useState("");
  const [disposeNotes, setDisposeNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const transferMut = useMutation({
    mutationFn: () => transferAssetAction(asset.id, transferTo, transferNotes || null),
    onSuccess: (r) => {
      if (r.ok) {
        setErr(null);
        setTransferTo("");
        setTransferNotes("");
        setModal(null);
        setMenuOpen(false);
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
        setModal(null);
        setMenuOpen(false);
        onDone();
      } else {
        setErr(r.error);
      }
    },
  });

  const disposeMut = useMutation({
    mutationFn: () => disposeAssetAction(asset.id, disposeNotes || null),
    onSuccess: (r) => {
      if (r.ok) {
        setErr(null);
        setDisposeNotes("");
        setModal(null);
        setMenuOpen(false);
        onDone();
      } else {
        setErr(r.error);
      }
    },
  });

  const otherOffices = offices.filter((o) => o.id !== asset.office_id);

  return (
    <div className="relative">
      {err && <p className="text-xs text-red-600">{err}</p>}
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded p-1 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        aria-label="Open asset actions"
        aria-expanded={menuOpen}
      >
        ...
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-8 z-10 min-w-40 rounded-md border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit(asset);
                setMenuOpen(false);
              }}
              className="block w-full rounded px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onToggleHistory();
              setMenuOpen(false);
            }}
            className="block w-full rounded px-3 py-2 text-left text-xs text-blue-700 hover:bg-neutral-100 dark:text-blue-300 dark:hover:bg-neutral-800"
          >
            {historyOpen ? "Hide history" : "History"}
          </button>
          <button
            type="button"
            disabled={!!asset.disposed_at}
            onClick={() => {
              setModal("transfer");
              setMenuOpen(false);
            }}
            className="block w-full rounded px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Transfer
          </button>
          <button
            type="button"
            disabled={!!asset.disposed_at}
            onClick={() => {
              setModal("maintenance");
              setMenuOpen(false);
            }}
            className="block w-full rounded px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Maintenance
          </button>
          <button
            type="button"
            disabled={!!asset.disposed_at}
            onClick={() => {
              setModal("dispose");
              setMenuOpen(false);
            }}
            className="block w-full rounded px-3 py-2 text-left text-xs text-rose-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300 dark:hover:bg-neutral-800"
          >
            Dispose
          </button>
        </div>
      )}

      {modal === "transfer" && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Transfer asset
            </h3>
            <div className="mt-3 space-y-3">
              <select
                value={transferTo}
                onChange={(e) => setTransferTo(e.target.value)}
                className="w-full rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950"
              >
                <option value="">Select destination office</option>
                {otherOffices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} - {o.name}
                  </option>
                ))}
              </select>
              <input
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!transferTo || transferMut.isPending}
                  onClick={() => transferMut.mutate()}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  {transferMut.isPending ? "Saving..." : "Confirm transfer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "maintenance" && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Log maintenance
            </h3>
            <div className="mt-3 space-y-3">
              <textarea
                value={maintNotes}
                onChange={(e) => setMaintNotes(e.target.value)}
                placeholder="Maintenance notes"
                rows={4}
                className="w-full rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!maintNotes.trim() || maintMut.isPending}
                  onClick={() => maintMut.mutate()}
                  className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                >
                  {maintMut.isPending ? "Saving..." : "Save maintenance"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "dispose" && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Dispose asset
            </h3>
            <div className="mt-3 space-y-3">
              <input
                value={disposeNotes}
                onChange={(e) => setDisposeNotes(e.target.value)}
                placeholder="Disposal notes (optional)"
                className="w-full rounded border border-neutral-300 px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={disposeMut.isPending}
                  onClick={() => disposeMut.mutate()}
                  className="rounded bg-rose-700 px-3 py-1.5 text-sm text-white disabled:opacity-50 hover:bg-rose-800"
                >
                  {disposeMut.isPending ? "Disposing..." : "Confirm disposal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
