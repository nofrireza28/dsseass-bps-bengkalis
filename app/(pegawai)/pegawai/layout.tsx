import { requireRole } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/shared/sidebar";
import { DashboardHeader } from "@/components/shared/dashboard-header";

export default async function PegawaiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["PEGAWAI"]);

  return (
    <div className="flex h-screen bg-muted/20">
      <Sidebar role="PEGAWAI" roleLabel="Pegawai" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          userName={session.user.name ?? "Pegawai"}
          userEmail={session.user.email ?? ""}
          roleLabel="Pegawai"
          userRoles={session.user.roles ?? []}
          currentRole="PEGAWAI"
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
