"use client";

import { useEffect, useState } from "react";

type TransactionCreatedToastProps = {
  show: boolean;
};

export function TransactionCreatedToast({ show }: TransactionCreatedToastProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
  }, [show]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const id = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(id);
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-lg dark:border-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-100">
      Transaction created successfully.
    </div>
  );
}
