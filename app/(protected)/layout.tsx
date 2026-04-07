import { requireAccountingRole } from "@/lib/auth/guards";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAccountingRole();
  return children;
}
