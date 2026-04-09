import { requireAccountingRole } from "@/lib/auth/guards";
import { ProtectedNav } from "@/components/navigation/protected-nav";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, roles } = await requireAccountingRole();

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8">
      <ProtectedNav email={user.email ?? user.id} roles={roles} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
