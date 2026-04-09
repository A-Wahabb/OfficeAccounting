import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants/routes";
type DashboardRootPageProps = {
  searchParams?: { error?: string };
};

export default function DashboardPage({ searchParams }: DashboardRootPageProps) {
  const target =
    searchParams?.error != null
      ? `${ROUTES.dashboardOverview}?error=${encodeURIComponent(searchParams.error)}`
      : ROUTES.dashboardOverview;
  redirect(target);
}
