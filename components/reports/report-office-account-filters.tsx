"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ReportFilterOffice = { id: string; name: string; code: string };
export type ReportFilterAccount = { id: string; code: string; name: string };

type SearchableSelectProps = {
  name: string;
  label: string;
  emptyLabel: string;
  searchPlaceholder: string;
  defaultValue: string;
  options: { value: string; label: string }[];
};

function SearchableSelect({
  name,
  label,
  emptyLabel,
  searchPlaceholder,
  defaultValue,
  options,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const allOptions = useMemo(
    () => [{ value: "", label: emptyLabel }, ...options],
    [emptyLabel, options],
  );

  const selectedLabel = useMemo(() => {
    const found = allOptions.find((o) => o.value === value);
    if (found) {
      return found.label;
    }
    if (value) {
      return `Unknown (${value.slice(0, 8)}…)`;
    }
    return emptyLabel;
  }, [allOptions, value, emptyLabel]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return allOptions;
    }
    return allOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [allOptions, query]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const inputClass =
    "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-offset-2 focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900";

  return (
    <div className="space-y-1" ref={rootRef}>
      <span className="text-sm text-neutral-700 dark:text-neutral-300">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => {
            setOpen((o) => !o);
            if (!open) {
              setQuery("");
            }
          }}
          className={`${inputClass} flex items-center justify-between text-left`}
        >
          <span className={value ? "text-neutral-900 dark:text-neutral-100" : "text-neutral-500"}>
            {selectedLabel}
          </span>
          <span className="text-neutral-400" aria-hidden>
            ▾
          </span>
        </button>
        {open && (
          <div
            className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-950"
            role="presentation"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full border-b border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900"
              autoComplete="off"
              autoFocus
            />
            <ul className="max-h-52 overflow-y-auto py-1 text-sm" role="listbox">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-neutral-500">No matches</li>
              ) : (
                filtered.map((o) => (
                  <li key={o.value === "" ? "__all" : o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === o.value}
                      className="w-full px-3 py-1.5 text-left text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => {
                        setValue(o.value);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      {o.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

type ReportOfficeAccountFiltersProps = {
  offices: ReportFilterOffice[];
  accounts: ReportFilterAccount[];
  defaultOfficeId: string;
  defaultAccountId: string;
};

export function ReportOfficeAccountFilters({
  offices,
  accounts,
  defaultOfficeId,
  defaultAccountId,
}: ReportOfficeAccountFiltersProps) {
  const officeOptions = useMemo(
    () =>
      offices.map((o) => ({
        value: o.id,
        label: `${o.code} — ${o.name}`,
      })),
    [offices],
  );

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: `${a.code} — ${a.name}`,
      })),
    [accounts],
  );

  return (
    <>
      <SearchableSelect
        name="office_id"
        label="Office (optional)"
        emptyLabel="All offices"
        searchPlaceholder="Search by code or name…"
        defaultValue={defaultOfficeId}
        options={officeOptions}
      />
      <SearchableSelect
        name="account_id"
        label="Account (optional)"
        emptyLabel="All accounts"
        searchPlaceholder="Search by code or name…"
        defaultValue={defaultAccountId}
        options={accountOptions}
      />
    </>
  );
}
