import { requireRole } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/shared/sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";

export default async function PimpinanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["PIMPINAN"]);

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar role="PIMPINAN" roleLabel="Pimpinan" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          userName={session.user.name ?? "Pimpinan"}
          userEmail={session.user.email ?? ""}
          roleLabel="Pimpinan"
          userRoles={session.user.roles ?? []}
          currentRole="PIMPINAN"
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
