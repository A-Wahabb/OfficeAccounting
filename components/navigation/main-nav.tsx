import Link from "next/link";

import { NavAuth } from "@/components/navigation/nav-auth";
import { ROUTES } from "@/lib/constants/routes";

export function MainNav() {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={ROUTES.dashboardOverview}
          className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
        >
          Office Accounting
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href={ROUTES.dashboardOverview}
            className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            Dashboard
          </Link>
          <NavAuth />
        </nav>
      </div>
    </header>
  );
}
