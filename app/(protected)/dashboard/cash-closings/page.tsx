import Link from "next/link";
import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
import { getServerSessionStrict } from "@/lib/auth/session";
import { CashClosingManagement } from "@/modules/cash-closing";
import { listCashClosingsWithOffices } from "@/services/cash-closing";
import { listOffices } from "@/services/office";

export default async function CashClosingsPage() {
  const session = await getServerSessionStrict();
  if (!session) {
    redirect(`${ROUTES.login}?redirect=${encodeURIComponent(ROUTES.dashboardCashClosings)}`);
  }

  const [rows, offices] = await Promise.all([
    listCashClosingsWithOffices(),
    listOffices(),
  ]);

  const activeOffices = offices.filter((o) => o.status === "active");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href={ROUTES.dashboard}
          className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Daily cash closing
        </h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Record opening and closing balances per office per day.{" "}
          <strong>Difference</strong> is closing minus opening.{" "}
          <strong>Closed by</strong> is the user submitting the closing.
        </p>
      </div>

      {activeOffices.length === 0 ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          No active offices. Activate an office before recording closings.
        </p>
      ) : (
        <CashClosingManagement
          initialRows={rows}
          offices={activeOffices}
          currentUserId={session.user.id}
        />
      )}
    </div>
  );
}
